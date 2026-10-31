const billingService = require('../services/billingService');

async function getPreview(req, res, next) {
  try {
    const result = await billingService.previewBilling();
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function postRun(req, res, next) {
  try {
    const dryRun = Boolean(req.body && req.body.dryRun);
    const result = await billingService.runBilling({ dryRun });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getPreview,
  postRun,
};
