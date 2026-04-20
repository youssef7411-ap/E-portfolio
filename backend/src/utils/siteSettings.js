import SiteSettings from '../models/SiteSettings.js';

export const SITE_SETTINGS_KEY = 'primary';

export const DEFAULT_SITE_SETTINGS = {
  brand: {
    siteTitle: 'My E-Portfolio',
    siteSubtitle: 'Live dashboard for uploads, posts, and portfolio activity',
    heroKicker: 'Portfolio Command Center',
    heroHeadline: 'Open the site and understand the work in seconds.',
    heroHighlight: 'understand',
    heroCopy: 'Recent uploads, total posts, subject activity, and content mix now appear instantly on the main page so the portfolio feels more professional, data-driven, and polished from the first click.',
    headerStatusLabel: 'Uploads this month',
    loadingTitle: 'YOUSSEF',
    loadingSubtitle: 'PORTFOLIO',
    loadingCaption: 'Curated by Youssef',
    footerLabel: 'Curated by',
    footerSignature: 'Youssef',
    footerCopy: 'Curated by Youssef · © {{year}} E-Portfolio',
  },
  publicLayout: {
    showFeaturedProjects: true,
    subjectCard: {
      showImages: true,
      showDescription: true,
      showStats: true,
      showCta: true,
    },
  },
  admin: {
    editingEnabled: true,
  },
};

const asPlainObject = (value) => (
  value && typeof value === 'object' && !Array.isArray(value) ? value : {}
);

const textValue = (value, fallback, max = 240) => {
  if (value === undefined) return fallback;
  return String(value ?? '').slice(0, max);
};

const blockValue = (value, fallback, max = 3000) => {
  if (value === undefined) return fallback;
  return String(value ?? '').slice(0, max);
};

const booleanValue = (value, fallback) => (
  typeof value === 'boolean' ? value : fallback
);

export const mergeSiteSettings = (settings) => {
  const source = asPlainObject(settings);
  const brand = asPlainObject(source.brand);
  const publicLayout = asPlainObject(source.publicLayout);
  const subjectCard = asPlainObject(publicLayout.subjectCard);
  const admin = asPlainObject(source.admin);

  return {
    brand: {
      siteTitle: textValue(brand.siteTitle, DEFAULT_SITE_SETTINGS.brand.siteTitle, 120),
      siteSubtitle: textValue(brand.siteSubtitle, DEFAULT_SITE_SETTINGS.brand.siteSubtitle, 220),
      heroKicker: textValue(brand.heroKicker, DEFAULT_SITE_SETTINGS.brand.heroKicker, 120),
      heroHeadline: textValue(brand.heroHeadline, DEFAULT_SITE_SETTINGS.brand.heroHeadline, 220),
      heroHighlight: textValue(brand.heroHighlight, DEFAULT_SITE_SETTINGS.brand.heroHighlight, 80),
      heroCopy: blockValue(brand.heroCopy, DEFAULT_SITE_SETTINGS.brand.heroCopy, 1200),
      headerStatusLabel: textValue(brand.headerStatusLabel, DEFAULT_SITE_SETTINGS.brand.headerStatusLabel, 120),
      loadingTitle: textValue(brand.loadingTitle, DEFAULT_SITE_SETTINGS.brand.loadingTitle, 60),
      loadingSubtitle: textValue(brand.loadingSubtitle, DEFAULT_SITE_SETTINGS.brand.loadingSubtitle, 80),
      loadingCaption: textValue(brand.loadingCaption, DEFAULT_SITE_SETTINGS.brand.loadingCaption, 140),
      footerLabel: textValue(brand.footerLabel, DEFAULT_SITE_SETTINGS.brand.footerLabel, 120),
      footerSignature: textValue(brand.footerSignature, DEFAULT_SITE_SETTINGS.brand.footerSignature, 120),
      footerCopy: blockValue(brand.footerCopy, DEFAULT_SITE_SETTINGS.brand.footerCopy, 400),
    },
    publicLayout: {
      showFeaturedProjects: booleanValue(
        publicLayout.showFeaturedProjects,
        DEFAULT_SITE_SETTINGS.publicLayout.showFeaturedProjects,
      ),
      subjectCard: {
        showImages: booleanValue(
          subjectCard.showImages,
          DEFAULT_SITE_SETTINGS.publicLayout.subjectCard.showImages,
        ),
        showDescription: booleanValue(
          subjectCard.showDescription,
          DEFAULT_SITE_SETTINGS.publicLayout.subjectCard.showDescription,
        ),
        showStats: booleanValue(
          subjectCard.showStats,
          DEFAULT_SITE_SETTINGS.publicLayout.subjectCard.showStats,
        ),
        showCta: booleanValue(
          subjectCard.showCta,
          DEFAULT_SITE_SETTINGS.publicLayout.subjectCard.showCta,
        ),
      },
    },
    admin: {
      editingEnabled: booleanValue(
        admin.editingEnabled,
        DEFAULT_SITE_SETTINGS.admin.editingEnabled,
      ),
    },
  };
};

export const normalizeSiteSettingsUpdate = (incoming = {}, current = DEFAULT_SITE_SETTINGS) => {
  const base = mergeSiteSettings(current);
  const patch = asPlainObject(incoming);

  return {
    singletonKey: SITE_SETTINGS_KEY,
    ...base,
    ...mergeSiteSettings({
      brand: { ...base.brand, ...asPlainObject(patch.brand) },
      publicLayout: {
        ...base.publicLayout,
        ...asPlainObject(patch.publicLayout),
        subjectCard: {
          ...base.publicLayout.subjectCard,
          ...asPlainObject(asPlainObject(patch.publicLayout).subjectCard),
        },
      },
      admin: { ...base.admin, ...asPlainObject(patch.admin) },
    }),
    updatedAt: new Date(),
  };
};

export const getPublicSiteSettings = (settings) => {
  const merged = mergeSiteSettings(settings);
  return {
    brand: merged.brand,
    publicLayout: merged.publicLayout,
  };
};

export const getOrCreateSiteSettings = async () => {
  let settings = await SiteSettings.findOne({ singletonKey: SITE_SETTINGS_KEY });
  if (!settings) {
    settings = await SiteSettings.create({
      singletonKey: SITE_SETTINGS_KEY,
      ...DEFAULT_SITE_SETTINGS,
      updatedAt: new Date(),
    });
  }
  return settings;
};
