import mongoose from 'mongoose';

const portfolioMetaSchema = new mongoose.Schema({
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
});

const PortfolioMeta = mongoose.model('PortfolioMeta', portfolioMetaSchema);
export default PortfolioMeta;
