import {
  FieldValue,
  type DocumentData,
  type DocumentReference,
  type Transaction,
} from "firebase-admin/firestore";
import { getDb } from "@/lib/firebase";
import {
  parseProjectDraftInput,
  parseProjectSubmissionInput,
  type ProjectDraftInput,
} from "@/lib/project-validation";
import {
  PROJECT_ERROR_CODES,
  ProjectError,
  type Project,
  type ProjectActor,
  type ProjectDocument,
} from "@/types/project";

const COLLECTION = "projects";

function timestampToIso(value: unknown): string | null {
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof value.toDate === "function"
  ) {
    return value.toDate().toISOString();
  }
  return null;
}

function toProject(id: string, data: DocumentData): Project {
  return {
    id,
    authorId: data.authorId,
    name: data.name,
    ...(data.description ? { description: data.description } : {}),
    ...(data.imageUrl ? { imageUrl: data.imageUrl } : {}),
    tags: Array.isArray(data.tags) ? data.tags : [],
    ...(data.activityStatus ? { activityStatus: data.activityStatus } : {}),
    ...(data.completionDate ? { completionDate: data.completionDate } : {}),
    publicationStatus: data.publicationStatus,
    createdAt: timestampToIso(data.createdAt),
    updatedAt: timestampToIso(data.updatedAt),
    submittedAt: timestampToIso(data.submittedAt),
    publishedAt: timestampToIso(data.publishedAt),
    ...(data.approvedBy ? { approvedBy: data.approvedBy } : {}),
  };
}

function assertAuthenticated(actor: ProjectActor): void {
  if (!actor.id) {
    throw new ProjectError(PROJECT_ERROR_CODES.UNAUTHENTICATED);
  }
}

function assertEligibleMember(data: DocumentData | undefined): void {
  if (!data || data.onboardingCompleted !== true) {
    throw new ProjectError(PROJECT_ERROR_CODES.ONBOARDING_REQUIRED);
  }
  if (data.optedOut === true) {
    throw new ProjectError(PROJECT_ERROR_CODES.OPTED_OUT);
  }
}

async function requireEligibleActor(actor: ProjectActor): Promise<void> {
  assertAuthenticated(actor);
  const member = await getDb().collection("members").doc(actor.id).get();
  assertEligibleMember(member.exists ? member.data() : undefined);
}

async function requireEligibleActorInTransaction(
  transaction: Transaction,
  actor: ProjectActor,
): Promise<void> {
  assertAuthenticated(actor);
  const member = await transaction.get(
    getDb().collection("members").doc(actor.id),
  );
  assertEligibleMember(member.exists ? member.data() : undefined);
}

function assertAdmin(actor: ProjectActor): void {
  if (!actor.isAdmin) {
    throw new ProjectError(PROJECT_ERROR_CODES.ADMIN_REQUIRED);
  }
}

async function readProject(ref: DocumentReference): Promise<Project> {
  const snapshot = await ref.get();
  if (!snapshot.exists) {
    throw new ProjectError(PROJECT_ERROR_CODES.NOT_FOUND);
  }
  return toProject(snapshot.id, snapshot.data()!);
}

function byUpdatedAtDesc(a: Project, b: Project): number {
  return (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "");
}

export async function createProjectDraft(
  actor: ProjectActor,
  body: unknown,
): Promise<Project> {
  const input = parseProjectDraftInput(body);
  const db = getDb();
  const ref = db.collection(COLLECTION).doc();

  await db.runTransaction(async (transaction) => {
    await requireEligibleActorInTransaction(transaction, actor);
    transaction.create(ref, {
      ...input,
      authorId: actor.id,
      publicationStatus: "draft",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    } satisfies Omit<ProjectDocument, "createdAt" | "updatedAt"> & {
      createdAt: FieldValue;
      updatedAt: FieldValue;
    });
  });

  return readProject(ref);
}

export async function getProjectForActor(
  actor: ProjectActor,
  id: string,
): Promise<Project> {
  await requireEligibleActor(actor);
  const project = await readProject(getDb().collection(COLLECTION).doc(id));
  if (project.authorId === actor.id) return project;
  if (actor.isAdmin && project.publicationStatus !== "draft") return project;
  throw new ProjectError(PROJECT_ERROR_CODES.FORBIDDEN);
}

export async function listProjectsByAuthor(
  actor: ProjectActor,
): Promise<Project[]> {
  await requireEligibleActor(actor);
  const snapshot = await getDb()
    .collection(COLLECTION)
    .where("authorId", "==", actor.id)
    .get();
  return snapshot.docs
    .map((document) => toProject(document.id, document.data()))
    .sort(byUpdatedAtDesc);
}

export async function listPendingProjects(
  actor: ProjectActor,
): Promise<Project[]> {
  await requireEligibleActor(actor);
  assertAdmin(actor);
  const snapshot = await getDb()
    .collection(COLLECTION)
    .where("publicationStatus", "==", "pending")
    .get();
  return snapshot.docs
    .map((document) => toProject(document.id, document.data()))
    .sort(byUpdatedAtDesc);
}

export async function listAllProjects(actor: ProjectActor): Promise<Project[]> {
  await requireEligibleActor(actor);
  assertAdmin(actor);
  const snapshot = await getDb().collection(COLLECTION).get();
  return snapshot.docs
    .map((document) => toProject(document.id, document.data()))
    .filter((project) => project.publicationStatus !== "draft")
    .sort(byUpdatedAtDesc);
}

export async function listPublishedProjects(): Promise<Project[]> {
  const snapshot = await getDb()
    .collection(COLLECTION)
    .where("publicationStatus", "==", "published")
    .get();
  return snapshot.docs.map((document) =>
    toProject(document.id, document.data()),
  );
}

function contentUpdates(input: ProjectDraftInput): Record<string, unknown> {
  return {
    name: input.name,
    description: input.description ?? FieldValue.delete(),
    imageUrl: input.imageUrl ?? FieldValue.delete(),
    tags: input.tags,
    activityStatus: input.activityStatus ?? FieldValue.delete(),
    completionDate: input.completionDate ?? FieldValue.delete(),
    updatedAt: FieldValue.serverTimestamp(),
  };
}

export async function updateProjectContent(
  actor: ProjectActor,
  id: string,
  body: unknown,
): Promise<Project> {
  const db = getDb();
  const ref = db.collection(COLLECTION).doc(id);

  await db.runTransaction(async (transaction) => {
    await requireEligibleActorInTransaction(transaction, actor);
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) {
      throw new ProjectError(PROJECT_ERROR_CODES.NOT_FOUND);
    }
    const current = toProject(snapshot.id, snapshot.data()!);
    if (current.authorId !== actor.id) {
      throw new ProjectError(PROJECT_ERROR_CODES.FORBIDDEN);
    }

    const input =
      current.publicationStatus === "draft"
        ? parseProjectDraftInput(body)
        : parseProjectSubmissionInput(body);
    transaction.update(ref, contentUpdates(input));
  });

  return readProject(ref);
}

export async function deleteProject(
  actor: ProjectActor,
  id: string,
): Promise<void> {
  const db = getDb();
  const ref = db.collection(COLLECTION).doc(id);

  await db.runTransaction(async (transaction) => {
    await requireEligibleActorInTransaction(transaction, actor);
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) {
      throw new ProjectError(PROJECT_ERROR_CODES.NOT_FOUND);
    }
    if (snapshot.data()!.authorId !== actor.id && !actor.isAdmin) {
      throw new ProjectError(PROJECT_ERROR_CODES.FORBIDDEN);
    }
    transaction.delete(ref);
  });
}
