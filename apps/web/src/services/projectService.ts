import { BuildingModel } from '@buildplanner/building-model';
import { generatePlanningCandidates } from '@buildplanner/planning-engine';

export interface LocalProject {
  _id: string;
  userId?: string;
  userEmail?: string;
  name: string;
  description?: string;
  propertyType: 'RESIDENTIAL' | 'DEVELOPER';
  location: { city: string; state: string; country: string };
  plot: { widthMm: number; lengthMm: number; shape: 'RECTANGLE' | 'L_SHAPE' | 'CUSTOM' };
  roads?: any;
  orientationNorthDegrees?: number;
  floorsCount?: number;
  floorRequirements?: any[];
  parking?: any;
  staircase?: any;
  vastu?: any;
  budget?: any;
  futureFloors?: any;
  currentModel?: BuildingModel;
  currentVersionNumber: number;
  createdAt: string;
  updatedAt: string;
}

const LOCAL_PROJECTS_KEY = 'bp_local_projects';

export function getAllLocalProjectsRaw(): LocalProject[] {
  try {
    const raw = localStorage.getItem(LOCAL_PROJECTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Failed to get raw local projects:', err);
    return [];
  }
}

export function listProjectsLocally(filterUserId?: string): LocalProject[] {
  try {
    const list = getAllLocalProjectsRaw();
    
    // Explicit filter passed
    if (filterUserId !== undefined) {
      if (!filterUserId || filterUserId === 'guest') {
        return list.filter((p) => !p.userId || p.userId === 'guest');
      }
      return list.filter((p) => p.userId === filterUserId);
    }

    // Default to active user session if available
    const storedUserRaw = localStorage.getItem('bp_user');
    if (storedUserRaw) {
      try {
        const user = JSON.parse(storedUserRaw);
        if (user?.id) {
          return list.filter((p) => p.userId === user.id || p.userEmail === user.email);
        }
      } catch {}
    }

    // If not logged in, show guest/unassigned designs
    return list.filter((p) => !p.userId || p.userId === 'guest');
  } catch (err) {
    console.error('Failed to list local projects:', err);
    return [];
  }
}

export function getProjectLocally(id: string): LocalProject | null {
  try {
    const direct = localStorage.getItem(`bp_local_project_${id}`);
    if (direct) return JSON.parse(direct);
    const list = getAllLocalProjectsRaw();
    return list.find((p) => p._id === id) || null;
  } catch (err) {
    console.error(`Failed to get local project ${id}:`, err);
    return null;
  }
}

export function saveProjectLocally(project: LocalProject): void {
  try {
    if (!project.userId || project.userId === 'guest') {
      const storedUserRaw = localStorage.getItem('bp_user');
      if (storedUserRaw) {
        try {
          const user = JSON.parse(storedUserRaw);
          if (user?.id) {
            project.userId = user.id;
            project.userEmail = user.email;
          }
        } catch {}
      }
    }

    localStorage.setItem(`bp_local_project_${project._id}`, JSON.stringify(project));
    const list = getAllLocalProjectsRaw();
    const idx = list.findIndex((p) => p._id === project._id);
    if (idx !== -1) {
      list[idx] = project;
    } else {
      list.unshift(project);
    }
    localStorage.setItem(LOCAL_PROJECTS_KEY, JSON.stringify(list));
  } catch (err) {
    console.error('Failed to save project locally:', err);
  }
}

export function deleteProjectLocally(id: string): void {
  try {
    localStorage.removeItem(`bp_local_project_${id}`);
    const list = getAllLocalProjectsRaw().filter((p) => p._id !== id);
    localStorage.setItem(LOCAL_PROJECTS_KEY, JSON.stringify(list));
  } catch (err) {
    console.error(`Failed to delete local project ${id}:`, err);
  }
}

export function claimGuestProjects(userId: string, userEmail: string): void {
  try {
    const list = getAllLocalProjectsRaw();
    let updated = false;
    for (const p of list) {
      if (!p.userId || p.userId === 'guest') {
        p.userId = userId;
        p.userEmail = userEmail;
        localStorage.setItem(`bp_local_project_${p._id}`, JSON.stringify(p));
        updated = true;
      }
    }
    if (updated) {
      localStorage.setItem(LOCAL_PROJECTS_KEY, JSON.stringify(list));
    }
  } catch (err) {
    console.error('Failed to claim guest projects:', err);
  }
}

export function generateLocalProject(wizardPayload: any): { project: LocalProject; buildingModel: BuildingModel } {
  const projectId = 'proj_' + Date.now();
  let userId = 'guest';
  let userEmail: string | undefined = undefined;

  try {
    const storedUserRaw = localStorage.getItem('bp_user');
    if (storedUserRaw) {
      const user = JSON.parse(storedUserRaw);
      if (user?.id) {
        userId = user.id;
        userEmail = user.email;
      }
    }
  } catch {}

  const candidates = generatePlanningCandidates({
    projectId,
    title: wizardPayload.name,
    location: wizardPayload.location,
    plot: wizardPayload.plot,
    roads: wizardPayload.roads,
    orientationNorthDegrees: wizardPayload.orientationNorthDegrees,
    floorsCount: wizardPayload.floorsCount,
    floorRequirements: wizardPayload.floorRequirements,
    parking: wizardPayload.parking,
    staircase: wizardPayload.staircase,
    vastu: wizardPayload.vastu,
    futureFloors: wizardPayload.futureFloors
  });

  const selectedModel = candidates[0].buildingModel;

  const project: LocalProject = {
    _id: projectId,
    userId,
    userEmail,
    name: wizardPayload.name,
    description: wizardPayload.description,
    propertyType: wizardPayload.propertyType || 'RESIDENTIAL',
    location: wizardPayload.location,
    plot: wizardPayload.plot,
    roads: wizardPayload.roads,
    orientationNorthDegrees: wizardPayload.orientationNorthDegrees,
    floorsCount: wizardPayload.floorsCount,
    floorRequirements: wizardPayload.floorRequirements,
    parking: wizardPayload.parking,
    staircase: wizardPayload.staircase,
    vastu: wizardPayload.vastu,
    futureFloors: wizardPayload.futureFloors,
    currentModel: selectedModel,
    currentVersionNumber: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  saveProjectLocally(project);

  return { project, buildingModel: selectedModel };
}
