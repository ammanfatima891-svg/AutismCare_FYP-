const mongoose = require('mongoose');
const { Schema } = mongoose;

/** One thread per case: parent ↔ therapist messaging. */
const ConversationSchema = new Schema(
  {
    caseId: {
      type: Schema.Types.ObjectId,
      ref: 'ChildCase',
      required: true,
      unique: true,
      index: true,
    },
    parentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    therapistId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    lastMessageAt: {
      type: Date,
      default: () => new Date(),
      index: true,
    },
  },
  { timestamps: true }
);

ConversationSchema.index({ therapistId: 1, lastMessageAt: -1 });
ConversationSchema.index({ parentId: 1, lastMessageAt: -1 });

module.exports = mongoose.model('Conversation', ConversationSchema);
