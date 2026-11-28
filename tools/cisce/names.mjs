// Name and address helpers shared by the CISCE import tools.
// Words that every school name shares; what is left is what tells two schools apart.
export const STOP = new Set(('the school schools public high higher senior sr secondary sec hr hs english medium convent academy '
  + 'of and for in at a an co ed coed girls boys residential day model institute institution centre center international '
  + 'mission memorial vidyalaya vidyalayam vidya mandir matriculation matric icse isc cisce ssc cbse primary middle junior '
  + 'nursery kindergarten campus branch unit no').split(' '));

export const norm = (s) => (s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
  .replace(/&/g, ' and ').replace(/\bst\.?\s/g, 'st ').replace(/['’`]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
export const tokens = (s) => norm(s).split(' ').filter((t) => t && !STOP.has(t) && !/^\d+$/.test(t));
export const host = (u) => {
  try { return new URL(/^https?:/i.test(u) ? u : `http://${u}`).hostname.toLowerCase().replace(/^www\d?\./, ''); } catch { return null; }
};
