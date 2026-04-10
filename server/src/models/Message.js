const mongoose = require('mongoose');
const { Schema } = mongoose;

const MessageSchema = new Schema(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 8000,
    },
    attachments: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

MessageSchema.index({ conversationId: 1, createdAt: 1 });

module.exports = mongoose.model('Message', MessageSchema);
