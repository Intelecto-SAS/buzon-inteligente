"use client";

import { useState } from "react";
import { Button, Field, inputClass } from "@/components/ui";
import type { ClassificationDecision } from "@/lib/classification/engine";

export function EvaluateForm({ action }: { action: (formData: FormData) => Promise<ClassificationDecision> }) {
  const [result, setResult] = useState<ClassificationDecision | null>(null);
  return (
    <form className="mt-6 grid gap-3 rounded-container border border-line bg-white p-4" action={async (formData) => setResult(await action(formData))}>
      <h2 className="text-sm font-semibold">Probar reglas sin ejecutar acciones</h2>
      <Field label="Asunto"><input className={inputClass} name="subject" /></Field>
      <Field label="Remitente"><input className={inputClass} name="sender" /></Field>
      <Field label="Cuerpo"><textarea className="min-h-24 w-full rounded-control border border-line p-2 text-sm" name="body" /></Field>
      <Button variant="secondary" type="submit">Evaluar</Button>
      {result ? (
        <div className="text-sm" role="status">
          <p>{result.explanation}</p>
          <ul className="mt-2">
            {result.scores.filter((item) => item.matched).map((item) => (
              <li key={item.categoryId}>{item.categoryName}: {item.score}. {item.hits.map((hit) => hit.text).join(", ")}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </form>
  );
}
