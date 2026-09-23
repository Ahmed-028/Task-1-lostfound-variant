import Joi from 'joi';
import { Item } from '../models/Item.js';

// TODO: write a validation schema for create/update per README.md section 2.
const objectId = Joi.string().hex().length(24);

const createSchema = Joi.object({
  title: Joi.string().min(2).max(60).required(),
  reportedBy: objectId
});

const updateSchema = Joi.object({
  title: Joi.string().min(2).max(60),
  description: Joi.string().min(2).max(60),
  category: Joi.string().min(2).max(60),
  status: Joi.string().min(2).max(60),
  location: Joi.string().min(2).max(60),
  reportedBy: objectId
});

function publicItem(u) {
    // reportedBy is either a raw ObjectId (not populated) or, when populate()
  // has swapped in the referenced User doc, an object with _id/name/email.
  const reportedBy =
    u.reportedBy && typeof u.reportedBy === 'object'
      ? { id: u.reportedBy._id.toString(), name: u.reportedBy.name, email: u.reportedBy.email }
      : u.reportedBy;
 
  return { id: u._id.toString(), title: u.title, description: u.description, category: u.category, status: u.status, location: u.location, reportedBy };
  //return { id: u._id.toString(), title: u.title, description: u.description, category: u.category, status: u.status, location: u.location, reportedBy: u.reportedBy };
}


// Only these query params translate into filters, and only as an exact
// match. Anything else on req.query is ignored rather than passed through
// to Mongo, so a caller can't smuggle in operators like status[$ne]=lost.
const FILTERABLE_FIELDS = ['status', 'category', 'location'];
 
function buildFilter(query) {
  const filter = {};
  for (const field of FILTERABLE_FIELDS) {
    if (typeof query[field] === 'string' && query[field].length > 0) {
      filter[field] = query[field];
    }
  }
  return filter;
}


// GET /api/items
// TODO: implement per README.md section 3.
export async function getAllItems(req, res, next) {
  try {
    //const items = await Item.find().sort({ createdAt: -1 }).lean();
    const filter = buildFilter(req.query);
    const items = await Item.find(filter)
      .sort({ createdAt: -1 })
      .populate('reportedBy', 'name email')
      .lean();
    res.json({ items: items.map(publicItem) });
  } catch (err) { next(err); }
}

// GET /api/items/:id
// TODO: implement per README.md section 3.
export async function getItem(req, res, next) {
  try {
  const item = await Item.findById(req.params.id).populate('reportedBy', 'name email');
    //const item = await Item.findById(req.params.id);
  if (!item) return res.status(404).json({ message: 'Item not found' });
  res.json({ item: publicItem(item) });
  } catch (err) { next(err); }
}

// POST /api/items
// TODO: implement per README.md section 3.
export async function createItem(req, res, next) {
  try {
      const { value, error } = createSchema.validate(req.body);
      if (error) return res.status(400).json({ message: error.message });
  
      const existing = await Item.findOne({ title: value.title});
      if (existing) return res.status(409).json({ message: 'Item already exists' });
  
      const item = await Item.create({ title: value.title, reportedBy:value.reportedBy });
      await item.populate('reportedBy', 'name email');
      res.status(201).json({ item: publicItem(item) });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/items/:id
// TODO: implement per README.md section 3.
export async function updateItem(req, res, next) {
  try {
      const { value, error } = updateSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
      if (error) return res.status(400).json({ message: error.message });
  
      const doc = await Item.findByIdAndUpdate(req.params.id, { $set: value }, { new: true, runValidators: true });
      if (!doc) return res.status(404).json({ message: 'Item not found' });
      res.json({ item: publicItem(doc) });
  } catch (err) { next(err); }
}

// DELETE /api/items/:id
// TODO: implement per README.md section 3.
export async function deleteItem(req, res, next) {
  try {
      const doc = await Item.findByIdAndDelete(req.params.id);
      if (!doc) return res.status(404).json({ message: 'Item not found' });
      res.json({ ok: true });
  } catch (err) { next(err); }
}
