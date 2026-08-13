import type { ProjectGalleryItem } from "@/lib/projects";

// The shape a fetch of /api/projects (or the server-rendered initial
// page, passed through as props) actually is on the client: JSON has no
// Date type, so createdAt/updatedAt arrive as ISO strings. Shared here
// so ProjectsGalleryClient, ProjectsGrid, and GalleryProjectCard all
// agree on one type instead of each redeclaring their own Omit<...>.
export type ClientProjectGalleryItem = Omit<ProjectGalleryItem, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
};
