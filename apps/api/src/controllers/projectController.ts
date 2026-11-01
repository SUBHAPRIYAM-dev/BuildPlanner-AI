import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Project } from '../models/Project';
import { DesignVersion } from '../models/DesignVersion';
import { createDefaultBuildingModel, BuildingModelSchema } from '@buildplanner/building-model';
import { NotFoundError, ValidationError } from '@buildplanner/shared';
import { generatePlanningCandidates } from '@buildplanner/planning-engine';
import { MockAIProvider } from '@buildplanner/ai-engine';
import { renderFloorPlanSvg, renderElevationSvg } from '@buildplanner/drawing-engine';
import { evaluateRegulatoryCompliance, BHUBANESWAR_RULES } from '@buildplanner/rule-engine';

const aiProvider = new MockAIProvider();

function getParam(param: string | string[] | undefined): string {
  return Array.isArray(param) ? param[0] : (param || '');
}

export async function listProjects(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.userId;
    const projects = await Project.find({ userId }).sort({ updatedAt: -1 });

    res.json({
      success: true,
      data: projects
    });
  } catch (error) {
    next(error);
  }
}

export async function createProject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.userId;
    const {
      name,
      description,
      propertyType = 'RESIDENTIAL',
      location = { city: 'Bhubaneswar', state: 'Odisha', country: 'India' },
      plot = { widthMm: 9144, lengthMm: 12192, shape: 'RECTANGLE' },
      roads = {
        NORTH: { enabled: true, widthMm: 9144, type: 'ACCESS' },
        WEST: { enabled: true, widthMm: 12192, type: 'MAIN' },
        SOUTH: { enabled: false, widthMm: 0, type: 'ACCESS' },
        EAST: { enabled: false, widthMm: 0, type: 'ACCESS' }
      },
      orientationNorthDegrees = 0,
      floorsCount = 2,
      floorRequirements = [
        {
          levelIndex: 0,
          name: 'Ground Floor',
          bedrooms: 2,
          bathrooms: 2,
          attachedBathrooms: 1,
          commonBathrooms: 1,
          living: 1,
          dining: 1,
          kitchen: 1,
          puja: 1,
          balcony: 0,
          study: 0
        },
        {
          levelIndex: 1,
          name: 'First Floor',
          bedrooms: 2,
          bathrooms: 2,
          attachedBathrooms: 1,
          commonBathrooms: 1,
          living: 1,
          dining: 1,
          kitchen: 1,
          puja: 0,
          balcony: 1,
          study: 0
        }
      ],
      parking = { cars: 1, motorcycles: 0, location: 'SURFACE_PORCH' },
      staircase = { type: 'DOG_LEGGED_U', positionZone: 'WEST' },
      vastu = { enabled: true, preference: 'BALANCED' },
      budget = { minInr: 5000000, maxInr: 10000000 },
      futureFloors = { planned: true, count: 1 }
    } = req.body;

    const project = new Project({
      userId,
      name,
      description,
      propertyType,
      location,
      plot,
      roads,
      orientationNorthDegrees,
      floorsCount,
      floorRequirements,
      parking,
      staircase,
      vastu,
      budget,
      futureFloors,
      currentVersionNumber: 1,
      status: 'DRAFT'
    });

    // Create initial BuildingModel matching plot dimensions
    const initialModel = createDefaultBuildingModel({
      id: `bldg_${project._id.toString()}`,
      projectId: project._id.toString(),
      plotWidthMm: plot.widthMm,
      plotLengthMm: plot.lengthMm,
      levelsCount: floorsCount
    });

    project.currentModel = initialModel;
    await project.save();

    // Create initial DesignVersion V1
    await DesignVersion.create({
      projectId: project._id,
      versionNumber: 1,
      label: 'Initial Blueprint Setup',
      buildingModel: initialModel,
      source: 'GENERATOR',
      createdBy: userId
    });

    res.status(201).json({
      success: true,
      data: project
    });
  } catch (error) {
    next(error);
  }
}

export async function getProject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = getParam(req.params.id);
    const project = await Project.findById(id);

    if (!project) {
      throw new NotFoundError('Project', id);
    }

    res.json({
      success: true,
      data: project
    });
  } catch (error) {
    next(error);
  }
}

export async function updateProject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = getParam(req.params.id);
    const project = await Project.findById(id);

    if (!project) {
      throw new NotFoundError('Project', id);
    }

    const updated = await Project.findByIdAndUpdate(id, { $set: req.body }, { new: true });

    res.json({
      success: true,
      data: updated
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteProject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = getParam(req.params.id);
    const project = await Project.findById(id);

    if (!project) {
      throw new NotFoundError('Project', id);
    }

    await Project.findByIdAndDelete(id);
    await DesignVersion.deleteMany({ projectId: id });

    res.json({
      success: true,
      data: { message: 'Project and associated design versions deleted successfully' }
    });
  } catch (error) {
    next(error);
  }
}

export async function getProjectDesign(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = getParam(req.params.id);
    const project = await Project.findById(id);

    if (!project) {
      throw new NotFoundError('Project', id);
    }

    res.json({
      success: true,
      data: {
        projectId: project._id,
        currentVersionNumber: project.currentVersionNumber,
        buildingModel: project.currentModel
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function saveProjectDesign(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = getParam(req.params.id);
    const { buildingModel, changeDescription = 'Manual 2D/3D Editor modification', source = 'USER_EDIT' } = req.body;

    const parsedModel = BuildingModelSchema.safeParse(buildingModel);
    if (!parsedModel.success) {
      throw new ValidationError('Invalid BuildingModel schema payload', parsedModel.error.issues);
    }

    const project = await Project.findById(id);
    if (!project) {
      throw new NotFoundError('Project', id);
    }

    const newVersionNumber = project.currentVersionNumber + 1;
    const updatedModel = {
      ...parsedModel.data,
      versionNumber: newVersionNumber,
      metadata: {
        ...parsedModel.data.metadata,
        updatedAt: new Date().toISOString(),
        source: source as 'GENERATOR' | 'USER_EDIT' | 'AI_COMMAND',
        changeDescription
      }
    };

    project.currentModel = updatedModel;
    project.currentVersionNumber = newVersionNumber;
    project.status = 'IN_PROGRESS';
    await project.save();

    const versionDoc = await DesignVersion.create({
      projectId: project._id,
      versionNumber: newVersionNumber,
      label: `V${newVersionNumber} - ${changeDescription}`,
      buildingModel: updatedModel,
      source: source as 'GENERATOR' | 'USER_EDIT' | 'AI_COMMAND',
      createdBy: req.user?.userId
    });

    res.json({
      success: true,
      data: {
        version: versionDoc,
        buildingModel: updatedModel
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function listProjectVersions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = getParam(req.params.id);
    const versions = await DesignVersion.find({ projectId: id }).sort({ versionNumber: -1 });

    res.json({
      success: true,
      data: versions
    });
  } catch (error) {
    next(error);
  }
}

export async function restoreProjectVersion(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = getParam(req.params.id);
    const versionId = getParam(req.params.versionId);
    const project = await Project.findById(id);
    if (!project) throw new NotFoundError('Project', id);

    const version = await DesignVersion.findOne({ _id: versionId, projectId: id });
    if (!version) throw new NotFoundError('DesignVersion', versionId);

    const nextVersionNumber = project.currentVersionNumber + 1;
    const restoredModel = {
      ...version.buildingModel,
      versionNumber: nextVersionNumber,
      metadata: {
        ...version.buildingModel.metadata,
        updatedAt: new Date().toISOString(),
        source: 'USER_EDIT' as const,
        changeDescription: `Restored from version V${version.versionNumber}`
      }
    };

    project.currentModel = restoredModel;
    project.currentVersionNumber = nextVersionNumber;
    await project.save();

    await DesignVersion.create({
      projectId: project._id,
      versionNumber: nextVersionNumber,
      label: `V${nextVersionNumber} - Restored from V${version.versionNumber}`,
      buildingModel: restoredModel,
      source: 'USER_EDIT',
      createdBy: req.user?.userId
    });

    res.json({
      success: true,
      data: {
        restoredVersionNumber: nextVersionNumber,
        buildingModel: restoredModel
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function generateProjectDesign(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = getParam(req.params.id);
    const project = await Project.findById(id);
    if (!project) throw new NotFoundError('Project', id);

    const candidates = generatePlanningCandidates({
      projectId: project._id.toString(),
      title: project.name,
      location: project.location,
      plot: project.plot,
      roads: project.roads as any,
      orientationNorthDegrees: project.orientationNorthDegrees,
      floorsCount: project.floorsCount,
      floorRequirements: project.floorRequirements as any,
      parking: project.parking,
      staircase: (project as any).staircase,
      vastu: project.vastu as any,
      futureFloors: project.futureFloors
    });

    const selected = candidates[0];
    const newVersionNumber = project.currentVersionNumber + 1;
    const modelToSave = {
      ...selected.buildingModel,
      versionNumber: newVersionNumber
    };

    project.currentModel = modelToSave;
    project.currentVersionNumber = newVersionNumber;
    project.status = 'GENERATED';
    await project.save();

    await DesignVersion.create({
      projectId: project._id,
      versionNumber: newVersionNumber,
      label: `V${newVersionNumber} - Initial AI Blueprint Generation (${selected.name})`,
      buildingModel: modelToSave,
      source: 'GENERATOR',
      createdBy: req.user?.userId
    });

    res.json({
      success: true,
      data: {
        candidates,
        selectedCandidate: selected,
        buildingModel: modelToSave
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function chatWithProjectAI(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = getParam(req.params.id);
    const { message, activeLevelIndex = 0 } = req.body;
    const project = await Project.findById(id);
    if (!project) throw new NotFoundError('Project', id);

    if (!project.currentModel) {
      throw new ValidationError('Project has no generated building model to modify. Please generate a design first.');
    }

    const aiRes = await aiProvider.chat(
      { model: project.currentModel, activeLevelIndex },
      message
    );

    if (aiRes.operationApplied && aiRes.updatedModel) {
      const newVersionNumber = project.currentVersionNumber + 1;
      const modelToSave = {
        ...aiRes.updatedModel,
        versionNumber: newVersionNumber
      };

      project.currentModel = modelToSave;
      project.currentVersionNumber = newVersionNumber;
      await project.save();

      await DesignVersion.create({
        projectId: project._id,
        versionNumber: newVersionNumber,
        label: `V${newVersionNumber} - AI: ${aiRes.commandSummary || 'AI Copilot Edit'}`,
        buildingModel: modelToSave,
        source: 'AI_COMMAND',
        createdBy: req.user?.userId
      });

      res.json({
        success: true,
        data: {
          reply: aiRes.reply,
          operationApplied: true,
          buildingModel: modelToSave,
          versionNumber: newVersionNumber
        }
      });
      return;
    }

    res.json({
      success: true,
      data: {
        reply: aiRes.reply,
        operationApplied: false
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function exportProjectDrawing(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = getParam(req.params.id);
    const { levelIndex = 0 } = req.query;
    const project = await Project.findById(id);
    if (!project) throw new NotFoundError('Project', id);

    if (!project.currentModel) {
      throw new ValidationError('No building model available for export');
    }

    const floorPlanSvg = renderFloorPlanSvg(project.currentModel, Number(levelIndex));
    const northElevationSvg = renderElevationSvg(project.currentModel, 'NORTH');
    const westElevationSvg = renderElevationSvg(project.currentModel, 'WEST');

    res.json({
      success: true,
      data: {
        projectName: project.name,
        location: project.location,
        floorPlanSvg,
        elevations: {
          north: northElevationSvg,
          west: westElevationSvg
        },
        metadata: {
          scale: '1:50',
          units: 'Millimeters [Feet-Inches]',
          disclaimer: 'Preliminary AI-generated architectural design. Professional review required.'
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function getRulesAndJurisdictions(_req: Request, res: Response): Promise<void> {
  res.json({
    success: true,
    data: {
      jurisdiction: BHUBANESWAR_RULES.jurisdiction,
      rules: {
        maxCoverageSmallPlot: '65%',
        maxCoverageMediumPlot: '60%',
        minFrontSetback30ftRoad: '1.5m',
        minRearSetback: '1.0m',
        minSideSetback: '1.0m',
        maxBuildingHeight: '10.0m',
        minParkingPerDwelling: '1 Car Space'
      },
      verified: true
    }
  });
}
