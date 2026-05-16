"use client";

import { useEffect, useState, useTransition } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { QueueEntry } from "@/lib/types";
import { deleteQueueEntryAction, reorderQueueAction } from "@/app/actions";

type Props = {
  entries: QueueEntry[];
};

export default function QueueList({ entries }: Props) {
  const [items, setItems] = useState<QueueEntry[]>(entries);
  const [pending, startTransition] = useTransition();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  useEffect(() => {
    setItems(entries);
  }, [entries]);

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(items, oldIndex, newIndex);
    setItems(reordered);
    startTransition(async () => {
      await reorderQueueAction(reordered.map((i) => i.id));
    });
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-neutral-800 p-8 text-center text-sm text-neutral-500">
        대기 중인 질문이 없습니다.
        <br />
        참가자가 QR로 등록하면 여기 나타납니다.
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <ul className="space-y-2">
          {items.map((entry, idx) => (
            <SortableItem
              key={entry.id}
              entry={entry}
              index={idx}
              disabled={pending}
              onDelete={() =>
                startTransition(async () => {
                  await deleteQueueEntryAction(entry.id);
                })
              }
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function SortableItem({
  entry,
  index,
  disabled,
  onDelete,
}: {
  entry: QueueEntry;
  index: number;
  disabled: boolean;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: entry.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-3 rounded-lg border border-neutral-800 bg-neutral-900/50 p-4"
    >
      <button
        type="button"
        aria-label="순서 변경 핸들"
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none select-none rounded-md bg-neutral-800 px-2 py-1 text-xs text-neutral-400 hover:bg-neutral-700"
      >
        ⋮⋮
      </button>
      <div className="flex-1">
        <p className="flex items-baseline gap-2 text-sm font-semibold text-white">
          <span className="text-neutral-500">#{index + 1}</span>
          {entry.name}
        </p>
        <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-300">
          {entry.question}
        </p>
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={onDelete}
        className="rounded-md border border-neutral-700 px-2 py-1 text-xs text-neutral-400 hover:border-red-500/60 hover:text-red-300 disabled:opacity-40"
      >
        삭제
      </button>
    </li>
  );
}
