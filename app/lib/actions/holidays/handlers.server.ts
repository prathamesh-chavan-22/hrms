import type { IntentHandler } from "../intent-handler.server";
import { actionSuccess, actionError } from "../action-result";
import { requireHR } from "~/lib/auth/guards.server";
import { createSupabaseServerClient } from "~/lib/supabase.server";
import { getString, getTrimmedString } from "~/lib/validation/form-data";
import {
  createHoliday,
  updateHoliday,
  deleteHoliday,
} from "~/lib/repositories/holidays.repository";

const VALID_TYPES = ["national", "optional", "company"] as const;

async function getHolidaysContext(ctx: Parameters<IntentHandler>[0]) {
  const slug = ctx.params.slug!;
  const { tenant } = await requireHR(ctx.request, ctx.env, slug);
  const { supabase } = createSupabaseServerClient(ctx.request, ctx.env);
  return { tenant, supabase };
}

export const createHolidayHandler: IntentHandler = async (ctx) => {
  const intent = "create_holiday";
  const { tenant, supabase } = await getHolidaysContext(ctx);

  const name = getTrimmedString(ctx.form, "name");
  const date = getTrimmedString(ctx.form, "date");
  const type = getString(ctx.form, "type");
  const description = getTrimmedString(ctx.form, "description");

  if (!name) return actionError("Holiday name is required.", intent);
  if (!date) return actionError("Date is required.", intent);
  if (!VALID_TYPES.includes(type as (typeof VALID_TYPES)[number])) {
    return actionError("Invalid holiday type.", intent);
  }

  const { error } = await createHoliday(supabase, {
    tenantId: tenant.id,
    name,
    date,
    type,
    description,
  });

  if (error) {
    const msg = error.message.includes("unique")
      ? "A holiday with that name already exists on the same date."
      : "Failed to create holiday.";
    return actionError(msg, intent, 400);
  }

  return actionSuccess("Holiday added.", intent);
};

export const updateHolidayHandler: IntentHandler = async (ctx) => {
  const intent = "update_holiday";
  const { tenant, supabase } = await getHolidaysContext(ctx);

  const id = getTrimmedString(ctx.form, "id");
  const name = getTrimmedString(ctx.form, "name");
  const date = getTrimmedString(ctx.form, "date");
  const type = getString(ctx.form, "type");
  const description = getTrimmedString(ctx.form, "description");

  if (!id) return actionError("Holiday ID is required.", intent);
  if (!name) return actionError("Holiday name is required.", intent);
  if (!date) return actionError("Date is required.", intent);
  if (!VALID_TYPES.includes(type as (typeof VALID_TYPES)[number])) {
    return actionError("Invalid holiday type.", intent);
  }

  const { error } = await updateHoliday(supabase, {
    id,
    tenantId: tenant.id,
    name,
    date,
    type,
    description,
  });

  if (error) {
    const msg = error.message.includes("unique")
      ? "A holiday with that name already exists on the same date."
      : "Failed to update holiday.";
    return actionError(msg, intent, 400);
  }

  return actionSuccess("Holiday updated.", intent);
};

export const deleteHolidayHandler: IntentHandler = async (ctx) => {
  const intent = "delete_holiday";
  const { tenant, supabase } = await getHolidaysContext(ctx);

  const id = getTrimmedString(ctx.form, "id");
  if (!id) return actionError("Holiday ID is required.", intent);

  const { error } = await deleteHoliday(supabase, tenant.id, id);
  if (error) return actionError("Failed to delete holiday.", intent, 500);

  return actionSuccess("Holiday deleted.", intent);
};

export const holidaysIntentHandlers: Record<string, IntentHandler> = {
  create_holiday: createHolidayHandler,
  update_holiday: updateHolidayHandler,
  delete_holiday: deleteHolidayHandler,
};
