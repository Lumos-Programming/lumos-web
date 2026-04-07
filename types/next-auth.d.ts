import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      faceImage?: string | null;
      isAdmin: boolean;
    };
  }

  interface JWT {
    isAdmin?: boolean;
    faceImage?: string | null;
  }
}
