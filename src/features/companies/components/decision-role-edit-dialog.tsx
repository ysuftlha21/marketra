"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

import { editDecisionRoleSchema } from "../schema/decision-role.schema";
import { editDecisionRoleAction } from "../api/decision-role-actions";
import type { CompanyDecisionRoleRow } from "../repository/decision-role-repository";

interface DecisionRoleEditDialogProps {
  role: CompanyDecisionRoleRow;
  projectId: string;
  projectSlug: string;
  trigger?: React.ReactNode;
}

export function DecisionRoleEditDialog({
  role,
  projectId,
  projectSlug,
  trigger,
}: DecisionRoleEditDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.input<typeof editDecisionRoleSchema>>({
    resolver: zodResolver(editDecisionRoleSchema),
    defaultValues: {
      roleId: role.id,
      companyId: role.company_id,
      projectId,
      projectSlug,
      role_title: role.role_title,
      role_family: role.role_family,
      department: role.department,
      buying_role: role.buying_role,
      reasoning: role.reasoning,
      likely_pain_points: (role.likely_pain_points as string[]) || [],
      likely_objections: (role.likely_objections as string[]) || [],
      recommended_message_angles: (role.recommended_message_angles as string[]) || [],
      user_notes: role.user_notes || "",
    },
  });

  const {
    fields: painPoints,
    append: appendPain,
    remove: removePain,
  } = useFieldArray({ name: "likely_pain_points" as never, control: form.control });

  const {
    fields: objections,
    append: appendObj,
    remove: removeObj,
  } = useFieldArray({ name: "likely_objections" as never, control: form.control });

  const {
    fields: angles,
    append: appendAngle,
    remove: removeAngle,
  } = useFieldArray({ name: "recommended_message_angles" as never, control: form.control });

  const onSubmit = async (values: z.input<typeof editDecisionRoleSchema>) => {
    setIsSubmitting(true);
    try {
      const result = await editDecisionRoleAction(values);
      if (result.error) {
        alert(result.error);
      } else {
        setOpen(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger || <Button variant="outline">Edit</Button>}</DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Decision Role</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                name="role_title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role Title</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                name="buying_role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Buying Role</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                name="role_family"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role Family</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              name="reasoning"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reasoning</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              name="user_notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>User Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Add custom notes about this role..."
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <FormLabel>Likely Pain Points</FormLabel>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => appendPain("")}
                  disabled={painPoints.length >= 10}
                >
                  <Plus className="mr-2 h-4 w-4" /> Add
                </Button>
              </div>
              {painPoints.map((field, index) => (
                <div key={field.id} className="flex gap-2">
                  <Input {...form.register(`likely_pain_points.${index}`)} />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removePain(index)}
                  >
                    <Trash2 className="h-4 w-4 text-danger" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <FormLabel>Likely Objections</FormLabel>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => appendObj("")}
                  disabled={objections.length >= 10}
                >
                  <Plus className="mr-2 h-4 w-4" /> Add
                </Button>
              </div>
              {objections.map((field, index) => (
                <div key={field.id} className="flex gap-2">
                  <Input {...form.register(`likely_objections.${index}`)} />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeObj(index)}
                  >
                    <Trash2 className="h-4 w-4 text-danger" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <FormLabel>Recommended Angles</FormLabel>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => appendAngle("")}
                  disabled={angles.length >= 10}
                >
                  <Plus className="mr-2 h-4 w-4" /> Add
                </Button>
              </div>
              {angles.map((field, index) => (
                <div key={field.id} className="flex gap-2">
                  <Input {...form.register(`recommended_message_angles.${index}`)} />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeAngle(index)}
                  >
                    <Trash2 className="h-4 w-4 text-danger" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
