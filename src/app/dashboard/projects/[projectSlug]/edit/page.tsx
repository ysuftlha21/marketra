import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getProjectService } from "@/features/projects/services/project-service";
import { PageHeader } from "@/components/common/page-header";
import { ProjectForm } from "@/features/projects/components/project-form";

interface PageProps {
  params: Promise<{ projectSlug: string }>;
}

export const metadata = { title: "Edit project" };

export default async function EditProjectPage({ params }: PageProps) {
  const { projectSlug } = await params;
  const project = await getProjectService(projectSlug);
  if (!project) notFound();

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <Link
        href={`/dashboard/projects/${projectSlug}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> Back to project
      </Link>
      <PageHeader title={`Edit: ${project.name}`} description="Update your product information." />
      <ProjectForm project={project} />
    </div>
  );
}
