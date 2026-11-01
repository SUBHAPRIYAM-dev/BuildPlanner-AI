import mongoose, { Schema, Document } from 'mongoose';
import { BuildingModel } from '@buildplanner/building-model';

export interface IProject extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  propertyType: 'RESIDENTIAL' | 'DEVELOPER';
  location: {
    city: string;
    state: string;
    country: string;
  };
  plot: {
    widthMm: number;
    lengthMm: number;
    shape: 'RECTANGLE' | 'L_SHAPE' | 'CUSTOM';
  };
  roads: {
    NORTH: { enabled: boolean; widthMm: number; type?: string };
    SOUTH: { enabled: boolean; widthMm: number; type?: string };
    EAST: { enabled: boolean; widthMm: number; type?: string };
    WEST: { enabled: boolean; widthMm: number; type?: string };
  };
  orientationNorthDegrees: number;
  floorsCount: number;
  floorRequirements: Array<{
    levelIndex: number;
    name: string;
    bedrooms: number;
    bathrooms: number;
    attachedBathrooms: number;
    commonBathrooms: number;
    living: number;
    dining: number;
    kitchen: number;
    puja: number;
    balcony: number;
    study: number;
  }>;
  parking: {
    cars: number;
    motorcycles: number;
    location?: 'SURFACE_PORCH' | 'BASEMENT_UNDERGROUND' | 'STILT';
  };
  staircase?: {
    type?: 'DOG_LEGGED_U' | 'STRAIGHT' | 'L_SHAPED';
    positionZone?: 'WEST' | 'NORTH_WEST' | 'SOUTH_WEST' | 'SOUTH_EAST' | 'NORTH_EAST';
  };
  vastu: {
    enabled: boolean;
    preference: 'STRICT' | 'BALANCED' | 'FLEXIBLE';
  };
  budget?: {
    minInr: number;
    maxInr: number;
  };
  futureFloors: {
    planned: boolean;
    count: number;
  };
  currentModel?: BuildingModel;
  currentVersionNumber: number;
  status: 'DRAFT' | 'GENERATED' | 'IN_PROGRESS' | 'COMPLETED';
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema = new Schema<IProject>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    propertyType: {
      type: String,
      enum: ['RESIDENTIAL', 'DEVELOPER'],
      default: 'RESIDENTIAL'
    },
    location: {
      city: { type: String, required: true, default: 'Bhubaneswar' },
      state: { type: String, required: true, default: 'Odisha' },
      country: { type: String, required: true, default: 'India' }
    },
    plot: {
      widthMm: { type: Number, required: true, default: 9144 },
      lengthMm: { type: Number, required: true, default: 12192 },
      shape: { type: String, enum: ['RECTANGLE', 'L_SHAPE', 'CUSTOM'], default: 'RECTANGLE' }
    },
    roads: {
      NORTH: { enabled: { type: Boolean, default: true }, widthMm: { type: Number, default: 9144 }, type: { type: String, default: 'ACCESS' } },
      SOUTH: { enabled: { type: Boolean, default: false }, widthMm: { type: Number, default: 0 }, type: { type: String, default: 'ACCESS' } },
      EAST: { enabled: { type: Boolean, default: false }, widthMm: { type: Number, default: 0 }, type: { type: String, default: 'ACCESS' } },
      WEST: { enabled: { type: Boolean, default: true }, widthMm: { type: Number, default: 12192 }, type: { type: String, default: 'MAIN' } }
    },
    orientationNorthDegrees: { type: Number, default: 0 },
    floorsCount: { type: Number, default: 2 },
    floorRequirements: [
      {
        levelIndex: { type: Number, required: true },
        name: { type: String, required: true },
        bedrooms: { type: Number, default: 0 },
        bathrooms: { type: Number, default: 0 },
        attachedBathrooms: { type: Number, default: 0 },
        commonBathrooms: { type: Number, default: 0 },
        living: { type: Number, default: 1 },
        dining: { type: Number, default: 1 },
        kitchen: { type: Number, default: 1 },
        puja: { type: Number, default: 0 },
        balcony: { type: Number, default: 0 },
        study: { type: Number, default: 0 }
      }
    ],
    parking: {
      cars: { type: Number, default: 1 },
      motorcycles: { type: Number, default: 0 },
      location: { type: String, enum: ['SURFACE_PORCH', 'BASEMENT_UNDERGROUND', 'STILT'], default: 'SURFACE_PORCH' }
    },
    staircase: {
      type: { type: String, enum: ['DOG_LEGGED_U', 'STRAIGHT', 'L_SHAPED'], default: 'DOG_LEGGED_U' },
      positionZone: { type: String, enum: ['WEST', 'NORTH_WEST', 'SOUTH_WEST', 'SOUTH_EAST', 'NORTH_EAST'], default: 'WEST' }
    },
    vastu: {
      enabled: { type: Boolean, default: true },
      preference: { type: String, enum: ['STRICT', 'BALANCED', 'FLEXIBLE'], default: 'BALANCED' }
    },
    budget: {
      minInr: { type: Number, default: 5000000 },
      maxInr: { type: Number, default: 10000000 }
    },
    futureFloors: {
      planned: { type: Boolean, default: true },
      count: { type: Number, default: 1 }
    },
    currentModel: { type: Schema.Types.Mixed },
    currentVersionNumber: { type: Number, default: 1 },
    status: {
      type: String,
      enum: ['DRAFT', 'GENERATED', 'IN_PROGRESS', 'COMPLETED'],
      default: 'DRAFT'
    }
  },
  { timestamps: true }
);

ProjectSchema.index({ userId: 1, createdAt: -1 });

export const Project = mongoose.model<IProject>('Project', ProjectSchema);
