import { ListView } from "@/shared/ui/views/list/ListView";
import { ListItem } from "@/shared/ui/views/list/ListItem";

export default function ListViewPlayground() {
  return (
    <ListView>
      <ListItem
        title="Update Layout Gym Lantai 2"
        project="Precision Gym"
        projectCode="PRG"
        stage="DD"
        priority="High"
        due="Today"
        defaultExpanded
        subtasks={[
          { id: "1", label: "Revisi zoning", done: true },
          { id: "2", label: "Export PDF", done: false },
        ]}
      />

      <ListItem
        title="Upload Minutes of Meeting"
        project="Padel Fatmawati"
        projectCode="JPF"
        stage="ED"
        priority="Medium"
        due="Tomorrow"
        subtasks={[
          { id: "a", label: "Rapihin catatan", done: false },
        ]}
      />
    </ListView>
  );
}
