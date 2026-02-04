const crypto = require('crypto');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { encrypt, decrypt } = require('../utils/encryption');

const SETTINGS_KEY_LINKS = 'companyLinks';
const SETTINGS_KEY_SHARE_TOKEN = 'companyLinksShareToken';

const safeJsonParse = (text) => {
  if (!text) return {};
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (e) {
    return {};
  }
};

const safeJsonStringify = (value) => {
  try {
    return JSON.stringify(value ?? {});
  } catch (e) {
    return JSON.stringify({});
  }
};

const normalizeUrl = (url) => {
  if (!url) return '';
  const trimmed = String(url).trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

const getCompanyIdFromRequest = (req) => req.user?.effectiveCompanyId || req.user?.companyId;

const loadCompanySettings = async (companyId) => {
  const company = await getSharedPrismaClient().company.findUnique({
    where: { id: companyId },
    select: { id: true, name: true, settings: true }
  });

  if (!company) {
    return { company: null, settings: {} };
  }

  const settings = safeJsonParse(company.settings);
  return { company, settings };
};

const saveCompanySettings = async (companyId, settings) => {
  return getSharedPrismaClient().company.update({
    where: { id: companyId },
    data: { settings: safeJsonStringify(settings) },
    select: { id: true, name: true, settings: true }
  });
};

const sanitizeLinkForList = (link) => {
  if (!link) return null;
  return {
    id: link.id,
    name: link.name,
    url: link.url,
    username: link.username,
    openMode: link.openMode || 'new_tab',
    hasPassword: Boolean(link.encryptedPassword)
  };
};

const listCompanyLinks = async (req, res) => {
  try {
    const companyId = getCompanyIdFromRequest(req);
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'Company context not found' });
    }

    const { company, settings } = await loadCompanySettings(companyId);
    if (!company) {
      return res.status(404).json({ success: false, message: 'الشركة غير موجودة' });
    }

    const links = Array.isArray(settings[SETTINGS_KEY_LINKS]) ? settings[SETTINGS_KEY_LINKS] : [];

    res.json({
      success: true,
      data: links.map(sanitizeLinkForList)
    });
  } catch (error) {
    console.error('❌ [COMPANY-LINKS] list error:', error);
    res.status(500).json({ success: false, message: 'فشل في جلب روابط الشركة' });
  }
};

const createCompanyLink = async (req, res) => {
  try {
    const companyId = getCompanyIdFromRequest(req);
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'Company context not found' });
    }

    const { name, url, username, password, openMode } = req.body || {};

    if (!name || !url) {
      return res.status(400).json({ success: false, message: 'name و url مطلوبين' });
    }

    const { settings } = await loadCompanySettings(companyId);

    const links = Array.isArray(settings[SETTINGS_KEY_LINKS]) ? settings[SETTINGS_KEY_LINKS] : [];

    const id = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');

    const newLink = {
      id,
      name: String(name).trim(),
      url: normalizeUrl(url),
      username: username ? String(username).trim() : '',
      openMode: openMode === 'in_app' ? 'in_app' : 'new_tab',
      encryptedPassword: password ? encrypt(String(password)) : null
    };

    links.push(newLink);
    settings[SETTINGS_KEY_LINKS] = links;

    await saveCompanySettings(companyId, settings);

    res.status(201).json({ success: true, data: sanitizeLinkForList(newLink) });
  } catch (error) {
    console.error('❌ [COMPANY-LINKS] create error:', error);
    res.status(500).json({ success: false, message: 'فشل في إنشاء الرابط' });
  }
};

const updateCompanyLink = async (req, res) => {
  try {
    const companyId = getCompanyIdFromRequest(req);
    const linkId = req.params?.id;

    if (!companyId) {
      return res.status(403).json({ success: false, message: 'Company context not found' });
    }

    if (!linkId) {
      return res.status(400).json({ success: false, message: 'Link id is required' });
    }

    const { name, url, username, password, openMode } = req.body || {};

    const { settings } = await loadCompanySettings(companyId);
    const links = Array.isArray(settings[SETTINGS_KEY_LINKS]) ? settings[SETTINGS_KEY_LINKS] : [];

    const idx = links.findIndex((l) => l?.id === linkId);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: 'الرابط غير موجود' });
    }

    const updated = { ...links[idx] };

    if (name !== undefined) updated.name = String(name).trim();
    if (url !== undefined) updated.url = normalizeUrl(url);
    if (username !== undefined) updated.username = String(username || '').trim();
    if (openMode !== undefined) updated.openMode = openMode === 'in_app' ? 'in_app' : 'new_tab';

    if (password !== undefined && password !== '') {
      updated.encryptedPassword = encrypt(String(password));
    }

    links[idx] = updated;
    settings[SETTINGS_KEY_LINKS] = links;

    await saveCompanySettings(companyId, settings);

    res.json({ success: true, data: sanitizeLinkForList(updated) });
  } catch (error) {
    console.error('❌ [COMPANY-LINKS] update error:', error);
    res.status(500).json({ success: false, message: 'فشل في تحديث الرابط' });
  }
};

const deleteCompanyLink = async (req, res) => {
  try {
    const companyId = getCompanyIdFromRequest(req);
    const linkId = req.params?.id;

    if (!companyId) {
      return res.status(403).json({ success: false, message: 'Company context not found' });
    }

    if (!linkId) {
      return res.status(400).json({ success: false, message: 'Link id is required' });
    }

    const { settings } = await loadCompanySettings(companyId);
    const links = Array.isArray(settings[SETTINGS_KEY_LINKS]) ? settings[SETTINGS_KEY_LINKS] : [];

    const nextLinks = links.filter((l) => l?.id !== linkId);

    settings[SETTINGS_KEY_LINKS] = nextLinks;

    await saveCompanySettings(companyId, settings);

    res.json({ success: true });
  } catch (error) {
    console.error('❌ [COMPANY-LINKS] delete error:', error);
    res.status(500).json({ success: false, message: 'فشل في حذف الرابط' });
  }
};

const getCompanyLinkPassword = async (req, res) => {
  try {
    const companyId = getCompanyIdFromRequest(req);
    const linkId = req.params?.id;

    if (!companyId) {
      return res.status(403).json({ success: false, message: 'Company context not found' });
    }

    const { settings } = await loadCompanySettings(companyId);
    const links = Array.isArray(settings[SETTINGS_KEY_LINKS]) ? settings[SETTINGS_KEY_LINKS] : [];

    const link = links.find((l) => l?.id === linkId);
    if (!link) {
      return res.status(404).json({ success: false, message: 'الرابط غير موجود' });
    }

    if (!link.encryptedPassword) {
      return res.json({ success: true, data: { password: '' } });
    }

    const password = decrypt(link.encryptedPassword) || '';

    res.json({ success: true, data: { password } });
  } catch (error) {
    console.error('❌ [COMPANY-LINKS] password error:', error);
    res.status(500).json({ success: false, message: 'فشل في جلب كلمة المرور' });
  }
};

const generateCompanyLinksShareToken = async (req, res) => {
  try {
    const companyId = getCompanyIdFromRequest(req);
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'Company context not found' });
    }

    const { settings } = await loadCompanySettings(companyId);

    const token = crypto.randomBytes(24).toString('hex');
    settings[SETTINGS_KEY_SHARE_TOKEN] = token;

    await saveCompanySettings(companyId, settings);

    res.json({ success: true, data: { token } });
  } catch (error) {
    console.error('❌ [COMPANY-LINKS] share token generate error:', error);
    res.status(500).json({ success: false, message: 'فشل في إنشاء لينك المشاركة' });
  }
};

const getCompanyLinksShareToken = async (req, res) => {
  try {
    const companyId = getCompanyIdFromRequest(req);
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'Company context not found' });
    }

    const { settings } = await loadCompanySettings(companyId);
    const token = settings?.[SETTINGS_KEY_SHARE_TOKEN] || null;

    res.json({ success: true, data: { token } });
  } catch (error) {
    console.error('❌ [COMPANY-LINKS] share token get error:', error);
    res.status(500).json({ success: false, message: 'فشل في جلب لينك المشاركة' });
  }
};

const revokeCompanyLinksShareToken = async (req, res) => {
  try {
    const companyId = getCompanyIdFromRequest(req);
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'Company context not found' });
    }

    const { settings } = await loadCompanySettings(companyId);
    delete settings[SETTINGS_KEY_SHARE_TOKEN];

    await saveCompanySettings(companyId, settings);

    res.json({ success: true });
  } catch (error) {
    console.error('❌ [COMPANY-LINKS] share token revoke error:', error);
    res.status(500).json({ success: false, message: 'فشل في إلغاء لينك المشاركة' });
  }
};

const getPublicCompanyLinksByToken = async (req, res) => {
  try {
    const token = String(req.params?.token || '').trim();
    if (!token) {
      return res.status(400).json({ success: false, message: 'Token is required' });
    }

    const candidateCompanies = await getSharedPrismaClient().company.findMany({
      where: {
        settings: {
          contains: token
        }
      },
      select: { id: true, name: true, settings: true },
      take: 10
    });

    let matchedCompany = null;
    let matchedSettings = null;

    for (const company of candidateCompanies) {
      const settings = safeJsonParse(company.settings);
      if (settings?.[SETTINGS_KEY_SHARE_TOKEN] === token) {
        matchedCompany = company;
        matchedSettings = settings;
        break;
      }
    }

    if (!matchedCompany) {
      return res.status(404).json({ success: false, message: 'لينك غير صالح' });
    }

    const links = Array.isArray(matchedSettings?.[SETTINGS_KEY_LINKS]) ? matchedSettings[SETTINGS_KEY_LINKS] : [];

    res.json({
      success: true,
      data: {
        company: {
          id: matchedCompany.id,
          name: matchedCompany.name
        },
        links: links.map(sanitizeLinkForList)
      }
    });
  } catch (error) {
    console.error('❌ [COMPANY-LINKS] public by token error:', error);
    res.status(500).json({ success: false, message: 'فشل في جلب الروابط' });
  }
};

module.exports = {
  listCompanyLinks,
  createCompanyLink,
  updateCompanyLink,
  deleteCompanyLink,
  getCompanyLinkPassword,
  generateCompanyLinksShareToken,
  getCompanyLinksShareToken,
  revokeCompanyLinksShareToken,
  getPublicCompanyLinksByToken
};
