import { Users } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentFamily } from "@/lib/dal";
import { selectPerson } from "@/app/actions/person";
import { AddPersonForm } from "@/components/AddPersonForm";
import { Avatar } from "@/components/Avatar";

export default async function ChiSeiPage() {
  const family = await getCurrentFamily();
  const people = await prisma.person.findMany({
    where: { familyId: family.id },
    orderBy: { createdAt: "asc" },
  });

  return (
    <main className="flex flex-1 items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-800 text-white shadow-sm">
            <Users size={30} strokeWidth={1.9} />
          </span>
          <h1 className="text-[24px] font-extrabold leading-tight tracking-tight text-ink-900">
            Chi sei?
          </h1>
          <p className="mt-1 text-[15px] text-ink-500">
            {family.displayName} — scegli il tuo nome per questo telefono
          </p>
        </div>

        {people.length > 0 && (
          <div className="mb-4 space-y-2.5">
            {people.map((person) => (
              <form key={person.id} action={selectPerson.bind(null, person.id)}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-3 rounded-xl bg-white px-4 py-3.5 text-left text-[16px] font-bold text-ink-900 shadow-sm ring-1 ring-sand-200 active:bg-sand-50"
                >
                  <Avatar name={person.name} size={40} />
                  {person.name}
                </button>
              </form>
            ))}
          </div>
        )}

        <AddPersonForm />
      </div>
    </main>
  );
}
