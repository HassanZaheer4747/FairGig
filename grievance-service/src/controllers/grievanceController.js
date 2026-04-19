const Complaint = require('../models/Complaint');
const { clusterComplaint, extractTags, assessSeverity } = require('../services/clustering');

exports.createComplaint = async (req, res) => {
  try {
    const { title, description, platform, city, category, is_public, worker_name } = req.body;
    if (!title || !description || !platform || !city) {
      return res.status(400).json({ success: false, message: 'title, description, platform, city are required' });
    }

    const cluster = clusterComplaint(title, description);
    const tags = extractTags(title, description);
    const severity = assessSeverity(`${title} ${description}`);

    const complaint = await Complaint.create({
      worker_id: req.user.userId,
      worker_name: worker_name || 'Anonymous',
      title, description, platform, city, category,
      cluster, tags, severity,
      is_public: is_public !== false,
    });

    res.status(201).json({ success: true, complaint });
  } catch (err) {
    console.error('Create complaint error:', err);
    res.status(500).json({ success: false, message: 'Failed to create complaint' });
  }
};

exports.getComplaints = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, platform, city, category, cluster, severity } = req.query;
    const query = {};

    if (req.user.role === 'worker') {
      query.$or = [{ worker_id: req.user.userId }, { is_public: true }];
    }

    if (status) query.status = status;
    if (platform) query.platform = platform;
    if (city) query.city = city;
    if (category) query.category = category;
    if (cluster) query.cluster = cluster;
    if (severity) query.severity = severity;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Complaint.countDocuments(query);
    const complaints = await Complaint.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    res.json({ success: true, complaints, pagination: { page: +page, limit: +limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch complaints' });
  }
};

exports.getComplaint = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id).lean();
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });
    res.json({ success: true, complaint });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch complaint' });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { status, resolution_note } = req.body;
    const update = { status };
    if (status === 'resolved') {
      update.resolved_at = new Date();
      update.resolution_note = resolution_note || 'Resolved by advocate';
    }

    const complaint = await Complaint.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });
    res.json({ success: true, complaint });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update status' });
  }
};

exports.upvoteComplaint = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ success: false, message: 'Not found' });

    const userId = req.user.userId;
    const alreadyUpvoted = complaint.upvoted_by.includes(userId);

    if (alreadyUpvoted) {
      complaint.upvoted_by = complaint.upvoted_by.filter(id => id !== userId);
      complaint.upvotes = Math.max(0, complaint.upvotes - 1);
    } else {
      complaint.upvoted_by.push(userId);
      complaint.upvotes += 1;
    }

    await complaint.save();
    res.json({ success: true, upvotes: complaint.upvotes, upvoted: !alreadyUpvoted });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to upvote' });
  }
};

exports.getTrending = async (req, res) => {
  try {
    const clusterStats = await Complaint.aggregate([
      { $group: {
        _id: '$cluster',
        count: { $sum: 1 },
        open_count: { $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] } },
        escalated_count: { $sum: { $cond: [{ $eq: ['$status', 'escalated'] }, 1, 0] } },
        platforms: { $addToSet: '$platform' },
        cities: { $addToSet: '$city' },
        avg_severity_score: { $avg: { $switch: {
          branches: [
            { case: { $eq: ['$severity', 'critical'] }, then: 4 },
            { case: { $eq: ['$severity', 'high'] }, then: 3 },
            { case: { $eq: ['$severity', 'medium'] }, then: 2 },
          ],
          default: 1
        }}}
      }},
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    const tagStats = await Complaint.aggregate([
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 15 }
    ]);

    const platformStats = await Complaint.aggregate([
      { $group: {
        _id: '$platform',
        total: { $sum: 1 },
        critical: { $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] } },
        resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
      }},
      { $sort: { total: -1 } }
    ]);

    res.json({
      success: true,
      trending_clusters: clusterStats.map(c => ({
        cluster: c._id,
        count: c.count,
        open: c.open_count,
        escalated: c.escalated_count,
        platforms: c.platforms,
        cities: c.cities
      })),
      trending_tags: tagStats.map(t => ({ tag: t._id, count: t.count })),
      platform_rankings: platformStats.map(p => ({
        platform: p._id,
        total_complaints: p.total,
        critical_count: p.critical,
        resolution_rate: p.total > 0 ? Math.round((p.resolved / p.total) * 100) : 0
      }))
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to get trending data' });
  }
};

exports.deleteComplaint = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ success: false, message: 'Not found' });

    if (req.user.role === 'worker' && complaint.worker_id !== req.user.userId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    await complaint.deleteOne();
    res.json({ success: true, message: 'Complaint deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete complaint' });
  }
};
