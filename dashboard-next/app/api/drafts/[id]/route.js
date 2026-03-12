import { NextResponse } from  next/server;
import connectDB from '../../../../lib/mongodb';
import EmailDraft from '../../../../models/EmailDraft';

const ALLOWED_CATEGORIES = [cover_story, reminder, follow_up, updated_cost, final_cost];

export async function PATCH(req, { params }) {
  try {
    await connectDB();
    const { id } = params;
    const payload = await req.json();
    const updates = {};
    if (payload.category) {
      if (!ALLOWED_CATEGORIES.includes(payload.category)) {
        return NextResponse.json({ error: Invalid category }, { status: 400 });
      }
      updates.category = payload.category;
    }
    if (payload.title) updates.title = payload.title;
    if (payload.subject) updates.subject = payload.subject;
    if (payload.body) updates.body = payload.body;
    if (!Object.keys(updates).length) {
      return NextResponse.json({ error: No updates provided }, { status: 400 });
    }
    const draft = await EmailDraft.findByIdAndUpdate(id, updates, { new: true, runValidators: true }).lean();
    if (!draft) {
      return NextResponse.json({ error: Draft not found }, { status: 404 });
    }
    return NextResponse.json({ draft });
  } catch (error) {
    return NextResponse.json({ error: error.message || Failed to update draft }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    await connectDB();
    const { id } = params;
    const result = await EmailDraft.findByIdAndDelete(id).lean();
    if (!result) {
      return NextResponse.json({ error: Draft not found }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message || Failed to delete draft }, { status: 500 });
  }
}
