const mongoose = require('mongoose');
const { Schema } = mongoose;

const LabReportSchema = new Schema({
    testRequestId: {
        type: Schema.Types.ObjectId,
        ref: 'LabTestRequest',
        required: [true, 'Test request ID is required'],
        index: true
    },
    childId: {
        type: Schema.Types.ObjectId,
        required: [true, 'Child ID is required'],
        index: true
    },
    clinicianId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Clinician ID is required']
    },
    labTechnicianId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Lab technician ID is required']
    },
    fileUrl: {
        type: String,
        required: [true, 'File URL is required']
    },
    fileType: {
        type: String,
        required: [true, 'File type is required'],
        enum: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
    },
    fileName: {
        type: String,
        required: [true, 'File name is required']
    },
    fileSize: {
        type: Number,
        required: [true, 'File size is required'],
        max: [25 * 1024 * 1024, 'File size exceeds 25MB limit']
    },
    uploadedAt: {
        type: Date,
        default: Date.now
    },
    releasedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('LabReport', LabReportSchema);
