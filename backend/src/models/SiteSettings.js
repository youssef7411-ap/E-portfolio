import mongoose from 'mongoose';

const subjectCardSettingsSchema = new mongoose.Schema({
  showImages: {
    type: Boolean,
    default: true,
  },
  showDescription: {
    type: Boolean,
    default: true,
  },
  showStats: {
    type: Boolean,
    default: true,
  },
  showCta: {
    type: Boolean,
    default: true,
  },
}, { _id: false });

const siteSettingsSchema = new mongoose.Schema({
  singletonKey: {
    type: String,
    unique: true,
    default: 'primary',
  },
  brand: {
    siteTitle: {
      type: String,
      default: 'My E-Portfolio',
    },
    siteSubtitle: {
      type: String,
      default: 'Live dashboard for uploads, posts, and portfolio activity',
    },
    heroKicker: {
      type: String,
      default: 'Portfolio Command Center',
    },
    heroHeadline: {
      type: String,
      default: 'Open the site and understand the work in seconds.',
    },
    heroHighlight: {
      type: String,
      default: 'understand',
    },
    heroCopy: {
      type: String,
      default: 'Recent uploads, total posts, subject activity, and content mix now appear instantly on the main page so the portfolio feels more professional, data-driven, and polished from the first click.',
    },
    headerStatusLabel: {
      type: String,
      default: 'Uploads this month',
    },
    loadingTitle: {
      type: String,
      default: 'YOUSSEF',
    },
    loadingSubtitle: {
      type: String,
      default: 'PORTFOLIO',
    },
    loadingCaption: {
      type: String,
      default: 'Curated by Youssef',
    },
    footerLabel: {
      type: String,
      default: 'Curated by',
    },
    footerSignature: {
      type: String,
      default: 'Youssef',
    },
    footerCopy: {
      type: String,
      default: 'Curated by Youssef · © {{year}} E-Portfolio',
    },
  },
  publicLayout: {
    showFeaturedProjects: {
      type: Boolean,
      default: true,
    },
    subjectCard: {
      type: subjectCardSettingsSchema,
      default: () => ({}),
    },
  },
  admin: {
    editingEnabled: {
      type: Boolean,
      default: true,
    },
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

const SiteSettings = mongoose.model('SiteSettings', siteSettingsSchema);
export default SiteSettings;
