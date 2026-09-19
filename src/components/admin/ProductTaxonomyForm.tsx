import { Button } from "@/components/ui/Button";
import type { Activity, Category } from "@/lib/types";

export function ProductTaxonomyForm({
  activities,
  categories,
  selectedActivityIds,
  selectedCategoryIds,
  action,
}: {
  activities: Activity[];
  categories: Category[];
  selectedActivityIds: string[];
  selectedCategoryIds: string[];
  action: (formData: FormData) => void;
}) {
  return (
    <form action={action} className="flex flex-col gap-6">
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-espresso/45">
          Activities
        </h3>
        <div className="flex flex-wrap gap-2">
          {activities.map((activity) => (
            <label
              key={activity.id}
              className="flex items-center gap-2 rounded-full border border-espresso/15 bg-white px-3.5 py-2 text-sm has-checked:border-accent-green has-checked:bg-accent-green/10"
            >
              <input
                type="checkbox"
                name="activity_ids"
                value={activity.id}
                defaultChecked={selectedActivityIds.includes(activity.id)}
                className="h-3.5 w-3.5 accent-accent-green"
              />
              {activity.icon} {activity.name}
            </label>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-espresso/45">
          Categories
        </h3>
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <label
              key={category.id}
              className="flex items-center gap-2 rounded-full border border-espresso/15 bg-white px-3.5 py-2 text-sm has-checked:border-accent-green has-checked:bg-accent-green/10"
            >
              <input
                type="checkbox"
                name="category_ids"
                value={category.id}
                defaultChecked={selectedCategoryIds.includes(category.id)}
                className="h-3.5 w-3.5 accent-accent-green"
              />
              {category.name}
            </label>
          ))}
          {categories.length === 0 && (
            <p className="text-sm text-espresso/45">Create categories under an activity first.</p>
          )}
        </div>
      </div>

      <div>
        <Button type="submit" size="sm">
          Save activities & categories
        </Button>
      </div>
    </form>
  );
}
