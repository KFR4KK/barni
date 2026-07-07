import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Container } from "@/components/ui/Container";
import { ProjectForm } from "@/components/projects/ProjectForm";

// Requires a session — anyone signed in can create a project, whether or
// not they've claimed a member Profile (see prisma/schema.prisma's
// comment on Project.authorId for why). No middleware entry for this
// route, same reasoning as /profile/edit: the real check happens here,
// in the Server Component itself.
export default async function NewProjectPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/");
  }

  return (
    <Container>
      <div className="py-16 md:py-24">
        <p className="font-mono text-xs uppercase tracking-wider text-brass">Новий проєкт</p>
        <h1 className="mt-2 font-serif text-3xl text-bone md:text-4xl">Створити проєкт</h1>
        <div className="mt-10">
          <ProjectForm mode="create" />
        </div>
      </div>
    </Container>
  );
}
