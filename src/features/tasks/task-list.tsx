import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import type { Group } from "@/core/selectors";
import type { Task, TaskList } from "@/core/model";
import { useDispatch } from "@/state/context";
import { useI18n } from "@/i18n";
import { TaskRow } from "./task-row";

interface Common {
  lists: ReadonlyMap<string, TaskList>;
  showList: boolean;
  onToggle(task: Task): void;
  onOpen(task: Task): void;
  describeDay(day: string): string;
}

function SortableRow({ task, ...common }: Common & { task: Task }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const handle = { ref: setActivatorNodeRef, ...attributes, ...listeners } as React.ComponentPropsWithoutRef<"button">;
  return (
    <TaskRow
      task={task}
      list={common.lists.get(task.listId)}
      showList={common.showList}
      onToggle={common.onToggle}
      onOpen={common.onOpen}
      describeDay={common.describeDay}
      handle={handle}
      rowRef={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      dragging={isDragging}
    />
  );
}

/** A flat list the user can reorder by dragging or with the keyboard. */
export function SortableTaskList({ tasks, ...common }: Common & { tasks: Task[] }) {
  const { t } = useI18n();
  const dispatch = useDispatch();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const title = (id: string | number) => tasks.find((x) => x.id === id)?.title ?? "";
  const announcements: Announcements = {
    onDragStart: ({ active }) => t("dragPicked", { title: title(active.id) }),
    onDragOver: ({ active }) => t("dragMoved", { title: title(active.id) }),
    onDragEnd: ({ active }) => t("dragDropped", { title: title(active.id) }),
    onDragCancel: () => t("dragCancelled"),
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = tasks.findIndex((x) => x.id === active.id);
    const to = tasks.findIndex((x) => x.id === over.id);
    if (from < 0 || to < 0) return;
    dispatch({ type: "reorder", ids: arrayMove(tasks, from, to).map((x) => x.id) });
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
      accessibility={{ announcements, screenReaderInstructions: { draggable: t("dragHint") } }}
    >
      <SortableContext items={tasks.map((x) => x.id)} strategy={verticalListSortingStrategy}>
        <ul className="tasks">
          {tasks.map((task) => (
            <SortableRow key={task.id} task={task} {...common} />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

export function PlainTaskList({ tasks, ...common }: Common & { tasks: Task[] }) {
  return (
    <ul className="tasks">
      {tasks.map((task) => (
        <TaskRow
          key={task.id}
          task={task}
          list={common.lists.get(task.listId)}
          showList={common.showList}
          onToggle={common.onToggle}
          onOpen={common.onOpen}
          describeDay={common.describeDay}
        />
      ))}
    </ul>
  );
}

export function GroupedTaskList({ groups, label, ...common }: Common & { groups: Group[]; label(key: string): string }) {
  return (
    <>
      {groups.map((group) => (
        <section key={group.key} className="group" aria-labelledby={`group-${group.key}`}>
          <h2 id={`group-${group.key}`} className={`group__title group__title--${/^\d/.test(group.key) ? "day" : group.key}`}>
            {label(group.key)} <span className="group__count">{group.tasks.length}</span>
          </h2>
          <PlainTaskList tasks={group.tasks} {...common} />
        </section>
      ))}
    </>
  );
}

export function CompletedSection({ tasks, ...common }: Common & { tasks: Task[] }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  if (tasks.length === 0) return null;
  return (
    <section className="group group--done">
      <button type="button" className="group__toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
        <ChevronDown aria-hidden="true" className={open ? "is-open" : ""} />
        {open ? t("hideCompleted") : t("showCompleted", { count: tasks.length })}
      </button>
      {open && <PlainTaskList tasks={tasks} {...common} />}
    </section>
  );
}
