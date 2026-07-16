import { PageHeader } from "@/components/common/page-header";
import { ProjectForm } from "@/features/projects/components/project-form";

export const metadata = { title: "New project" };

export default function NewProjectPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <PageHeader
        title="New project"
        description="Add a SaaS product to begin analyzing target markets."
      />
      <ProjectForm />
    </div>
  );
}
