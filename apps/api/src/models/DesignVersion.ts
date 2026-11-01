import mongoose, { Schema, Document } from 'mongoose';
import { BuildingModel } from '@buildplanner/building-model';

export interface IDesignVersion extends Document {
  projectId: mongoose.Types.ObjectId;
  versionNumber: number;
  label: string;
  buildingModel: BuildingModel;
  source: 'GENERATOR' | 'USER_EDIT' | 'AI_COMMAND';
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
}

const DesignVersionSchema = new Schema<IDesignVersion>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true
    },
    versionNumber: {
      type: Number,
      required: true
    },
    label: {
      type: String,
      required: true
    },
    buildingModel: {
      type: Schema.Types.Mixed,
      required: true
    },
    source: {
      type: String,
      enum: ['GENERATOR', 'USER_EDIT', 'AI_COMMAND'],
      default: 'GENERATOR'
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

DesignVersionSchema.index({ projectId: 1, versionNumber: -1 }, { unique: true });

export const DesignVersion = mongoose.model<IDesignVersion>('DesignVersion', DesignVersionSchema);
