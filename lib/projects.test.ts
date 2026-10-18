import { beforeEach, describe, expect, it } from "vitest";
import * as firebaseAdmin from "firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import {
  PROJECT_ERROR_CODES,
  ProjectError,
  type ProjectActor,
  type ProjectErrorCode,
  type ProjectPublicationStatus,
} from "@/types/project";
import {
  createProjectDraft,
  deleteProject,
  getProjectForActor,
  listAllProjects,
  listPendingProjects,
  listProjectsByAuthor,
  listPublishedProjects,
  updateProjectContent,
} from "./projects";

if (!firebaseAdmin.apps.length) {
  firebaseAdmin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || "test-project",
  });
}

const author: ProjectActor = { id: "author-1", isAdmin: false };
const otherMember: ProjectActor = { id: "member-2", isAdmin: false };
const admin: ProjectActor = { id: "admin-1", isAdmin: true };

const completeInput = {
  name: "Lumos Web",
  description: "Lumosの公式ウェブサイトを開発します。",
  imageUrl: "https://storage.googleapis.com/lumos/projects/lumos.webp",
  tags: ["Next.js", "TypeScript"],
  activityStatus: "active",
};

async function expectProjectError(
  promise: Promise<unknown>,
  code: ProjectErrorCode,
): Promise<void> {
  await expect(promise).rejects.toBeInstanceOf(ProjectError);
  await promise.catch((error) =>
    expect((error as ProjectError).code).toBe(code),
  );
}

async function putMember(
  actor: ProjectActor,
  overrides: Record<string, unknown> = {},
): Promise<void> {
  await firebaseAdmin
    .firestore()
    .collection("members")
    .doc(actor.id)
    .set({
      onboardingCompleted: true,
      optedOut: false,
      ...overrides,
    });
}

async function putProject(
  id: string,
  authorId: string,
  publicationStatus: ProjectPublicationStatus,
  overrides: Record<string, unknown> = {},
): Promise<void> {
  const now = Timestamp.now();
  await firebaseAdmin
    .firestore()
    .collection("projects")
    .doc(id)
    .set({
      authorId,
      name: id,
      description: `${id}の説明`,
      tags: [],
      activityStatus: "active",
      publicationStatus,
      createdAt: now,
      updatedAt: now,
      ...(publicationStatus === "published" ? { publishedAt: now } : {}),
      ...overrides,
    });
}

describe("project Firestore operations", () => {
  beforeEach(async () => {
    const db = firebaseAdmin.firestore();
    const collections = await db.listCollections();
    for (const collection of collections) {
      const documents = await collection.listDocuments();
      for (const document of documents) await document.delete();
    }

    await Promise.all([
      putMember(author),
      putMember(otherMember),
      putMember(admin),
    ]);
  });

  it("creates a draft with server-owned identity and state", async () => {
    const project = await createProjectDraft(author, {
      name: "  安全なプロジェクト  ",
      authorId: otherMember.id,
      publicationStatus: "published",
      approvedBy: otherMember.id,
    });

    expect(project).toMatchObject({
      authorId: author.id,
      name: "安全なプロジェクト",
      tags: [],
      publicationStatus: "draft",
    });
    expect(project.createdAt).not.toBeNull();
    expect(project.updatedAt).not.toBeNull();
    expect(project.publishedAt).toBeNull();
    expect(project).not.toHaveProperty("approvedBy");
  });

  it("rejects unauthenticated, missing, incomplete, and opted-out members", async () => {
    await expectProjectError(
      createProjectDraft({ id: "", isAdmin: false }, { name: "x" }),
      PROJECT_ERROR_CODES.UNAUTHENTICATED,
    );
    await expectProjectError(
      createProjectDraft({ id: "missing", isAdmin: false }, { name: "x" }),
      PROJECT_ERROR_CODES.ONBOARDING_REQUIRED,
    );

    await putMember(otherMember, { onboardingCompleted: false });
    await expectProjectError(
      createProjectDraft(otherMember, { name: "x" }),
      PROJECT_ERROR_CODES.ONBOARDING_REQUIRED,
    );

    await putMember(otherMember, { optedOut: true });
    await expectProjectError(
      createProjectDraft(otherMember, { name: "x" }),
      PROJECT_ERROR_CODES.OPTED_OUT,
    );
  });

  it("lists only the signed-in author's projects", async () => {
    const mine = await createProjectDraft(author, { name: "自分の下書き" });
    await createProjectDraft(otherMember, { name: "他人の下書き" });

    expect((await listProjectsByAuthor(author)).map((item) => item.id)).toEqual(
      [mine.id],
    );
  });

  it("re-checks eligibility for member and admin reads", async () => {
    await createProjectDraft(author, { name: "下書き" });
    await putMember(author, { optedOut: true });
    await expectProjectError(
      listProjectsByAuthor(author),
      PROJECT_ERROR_CODES.OPTED_OUT,
    );

    await putMember(admin, { onboardingCompleted: false });
    await expectProjectError(
      listAllProjects(admin),
      PROJECT_ERROR_CODES.ONBOARDING_REQUIRED,
    );
  });

  it("shows pending work to admins but excludes drafts from admin lists", async () => {
    await putProject("draft", author.id, "draft");
    await putProject("pending", author.id, "pending");
    await putProject("published", author.id, "published");

    expect((await listPendingProjects(admin)).map((item) => item.id)).toEqual([
      "pending",
    ]);
    expect(
      (await listAllProjects(admin)).map((item) => item.id).sort(),
    ).toEqual(["pending", "published"]);
    await expectProjectError(
      getProjectForActor(admin, "draft"),
      PROJECT_ERROR_CODES.FORBIDDEN,
    );
    expect((await getProjectForActor(admin, "pending")).id).toBe("pending");
  });

  it("requires admin privileges for review lists", async () => {
    await expectProjectError(
      listPendingProjects(author),
      PROJECT_ERROR_CODES.ADMIN_REQUIRED,
    );
    await expectProjectError(
      listAllProjects(author),
      PROJECT_ERROR_CODES.ADMIN_REQUIRED,
    );
  });

  it("returns only published projects to public callers", async () => {
    await putProject("draft", author.id, "draft");
    await putProject("pending", author.id, "pending");
    await putProject("published", author.id, "published");
    await putProject("creator-hidden", author.id, "hidden_by_creator");
    await putProject("admin-hidden", author.id, "hidden_by_admin");

    expect((await listPublishedProjects()).map((item) => item.id)).toEqual([
      "published",
    ]);
  });

  it("allows only the author to read a draft", async () => {
    const project = await createProjectDraft(author, { name: "秘密の下書き" });

    expect((await getProjectForActor(author, project.id)).id).toBe(project.id);
    await expectProjectError(
      getProjectForActor(otherMember, project.id),
      PROJECT_ERROR_CODES.FORBIDDEN,
    );
    await expectProjectError(
      getProjectForActor(author, "missing"),
      PROJECT_ERROR_CODES.NOT_FOUND,
    );
  });

  it("lets the author update content without changing publication state", async () => {
    const project = await createProjectDraft(author, { name: "変更前" });
    const updated = await updateProjectContent(author, project.id, {
      ...completeInput,
      name: "変更後",
      authorId: otherMember.id,
      publicationStatus: "published",
    });

    expect(updated.name).toBe("変更後");
    expect(updated.authorId).toBe(author.id);
    expect(updated.publicationStatus).toBe("draft");
  });

  it("uses full validation after a project leaves draft", async () => {
    await putProject("pending", author.id, "pending");

    await expectProjectError(
      updateProjectContent(author, "pending", { name: "名前だけ" }),
      PROJECT_ERROR_CODES.DESCRIPTION_REQUIRED,
    );
    const updated = await updateProjectContent(
      author,
      "pending",
      completeInput,
    );
    expect(updated.publicationStatus).toBe("pending");
  });

  it("does not let another member or an admin edit the author's content", async () => {
    const project = await createProjectDraft(author, { name: "変更不可" });

    await expectProjectError(
      updateProjectContent(otherMember, project.id, { name: "侵害" }),
      PROJECT_ERROR_CODES.FORBIDDEN,
    );
    await expectProjectError(
      updateProjectContent(admin, project.id, { name: "運営による変更" }),
      PROJECT_ERROR_CODES.FORBIDDEN,
    );
  });

  it("re-checks the author's opt-out state before updates", async () => {
    const project = await createProjectDraft(author, { name: "変更前" });
    await putMember(author, { optedOut: true });

    await expectProjectError(
      updateProjectContent(author, project.id, { name: "変更後" }),
      PROJECT_ERROR_CODES.OPTED_OUT,
    );
  });

  it("lets the author or an admin delete, but rejects other members", async () => {
    const authorProject = await createProjectDraft(author, {
      name: "作者が削除",
    });
    await deleteProject(author, authorProject.id);
    await expectProjectError(
      getProjectForActor(author, authorProject.id),
      PROJECT_ERROR_CODES.NOT_FOUND,
    );

    const adminProject = await createProjectDraft(author, {
      name: "運営が削除",
    });
    await deleteProject(admin, adminProject.id);
    await expectProjectError(
      getProjectForActor(author, adminProject.id),
      PROJECT_ERROR_CODES.NOT_FOUND,
    );

    const protectedProject = await createProjectDraft(author, {
      name: "他人は削除不可",
    });
    await expectProjectError(
      deleteProject(otherMember, protectedProject.id),
      PROJECT_ERROR_CODES.FORBIDDEN,
    );
  });

  it("returns NOT_FOUND for updates and deletes of missing projects", async () => {
    await expectProjectError(
      updateProjectContent(author, "missing", { name: "x" }),
      PROJECT_ERROR_CODES.NOT_FOUND,
    );
    await expectProjectError(
      deleteProject(author, "missing"),
      PROJECT_ERROR_CODES.NOT_FOUND,
    );
  });
});
