const CLUSTER_KEYWORDS = {
  'Wage Issues': ['wage', 'pay', 'payment', 'salary', 'underpaid', 'not paid', 'missing payment', 'late payment', 'theft'],
  'Unfair Deductions': ['deduction', 'commission', 'fee', 'charge', 'cut', 'percentage', 'overcharged', 'deducted'],
  'Account & Suspension': ['suspended', 'banned', 'account', 'blocked', 'terminated', 'deactivated', 'locked'],
  'Discrimination': ['discrimination', 'bias', 'unfair', 'race', 'gender', 'religion', 'treated', 'prejudice'],
  'Safety Concerns': ['safety', 'unsafe', 'accident', 'injury', 'dangerous', 'risk', 'protection', 'insurance'],
  'App & Technical': ['app', 'bug', 'glitch', 'technical', 'system', 'error', 'crash', 'offline', 'gps'],
  'Customer Issues': ['customer', 'rider', 'passenger', 'abuse', 'harassment', 'rating', 'review', 'complaint'],
  'Algorithm Fairness': ['algorithm', 'ai', 'automated', 'ranking', 'order', 'assignment', 'bias', 'unfair orders'],
};

function clusterComplaint(title, description) {
  const text = `${title} ${description}`.toLowerCase();
  const scores = {};

  for (const [cluster, keywords] of Object.entries(CLUSTER_KEYWORDS)) {
    scores[cluster] = 0;
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        scores[cluster] += 1;
      }
    }
  }

  const topCluster = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  return topCluster[1] > 0 ? topCluster[0] : 'General';
}

function extractTags(title, description) {
  const text = `${title} ${description}`.toLowerCase();
  const tags = new Set();

  const tagKeywords = [
    'uber', 'foodpanda', 'fiverr', 'careem', 'bykea',
    'lahore', 'karachi', 'islamabad',
    'deduction', 'payment', 'suspended', 'commission', 'rating',
    'safety', 'discrimination', 'wage', 'algorithm'
  ];

  for (const kw of tagKeywords) {
    if (text.includes(kw)) tags.add(kw);
  }

  return Array.from(tags).slice(0, 5);
}

function assessSeverity(text) {
  const criticalWords = ['theft', 'banned', 'suspended', 'assault', 'fraud', 'injury', 'discrimination'];
  const highWords = ['unfair', 'deactivated', 'significant', 'repeated', 'multiple'];
  const lowWords = ['minor', 'small', 'brief', 'occasional'];

  const lower = text.toLowerCase();

  if (criticalWords.some(w => lower.includes(w))) return 'critical';
  if (highWords.some(w => lower.includes(w))) return 'high';
  if (lowWords.some(w => lower.includes(w))) return 'low';
  return 'medium';
}

module.exports = { clusterComplaint, extractTags, assessSeverity };
