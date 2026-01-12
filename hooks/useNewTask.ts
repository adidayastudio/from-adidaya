export function useNewTask() {
  function createTask(data: {
    title: string;
    project?: string;
    priority: string;
    deadline?: string;
  }) {
    const newTask = {
      id: crypto.randomUUID(),
      title: data.title,
      project: data.project,
      priority: data.priority,
      deadline: data.deadline,
      status: "Not Started",
      createdAt: new Date().toISOString(),
    };

    console.log("NEW TASK:", newTask);

    // nanti:
    // - masuk global task store
    // - muncul di list / board / timeline / calendar
    // - save ke backend
  }

  return { createTask };
}
