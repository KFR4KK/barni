import { Button } from "@/components/ui/Button";

// Shown instead of ClaimProfileButton once the visitor owns this profile.
// Reuses the existing Button component's "outline" variant rather than
// introducing new button styling.
export function EditProfileButton() {
  return (
    <Button href="/profile/edit" variant="outline">
      Редагувати профіль
    </Button>
  );
}
