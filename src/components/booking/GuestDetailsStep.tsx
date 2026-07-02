import { useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useBooking } from '@/context/BookingContext';
import {
  MAX_GUESTS,
  ADULTS_MIN, ADULTS_MAX, CHILDREN_MIN, CHILDREN_MAX, INFANTS_MIN, INFANTS_MAX,
  ADULT_BAND, CHILD_BAND, INFANT_BAND, clampParty,
} from '@/lib/guestRules';
import { selectedFare, suiteMaxOccupancy } from '@/lib/bookingUI';
import type { BookingGuest } from '@/lib/api';

const TITLES = ['Mr', 'Mrs', 'Ms', 'Dr'] as const;

type GuestType = 'adult' | 'child' | 'infant';

/** A rendered guest row: its category, the index within the form array, and labelling. */
interface Descriptor {
  index: number;
  type: GuestType;
  lead: boolean;
  roleLabel: string;
  band: string;
}

/**
 * Ordered descriptor list — adults first (index 0 is the lead), then children,
 * then infants — laid over a stable MAX_GUESTS-length form array. Derived purely
 * from the party counts so both the UI and `superRefine` agree on which rows are
 * visible and how each should be validated.
 */
function buildDescriptors(adults: number, children: number, infants: number, t: TFunction): Descriptor[] {
  const out: Descriptor[] = [];
  let i = 0;
  for (let n = 0; n < adults && i < MAX_GUESTS; n++, i++) {
    out.push({
      index: i,
      type: 'adult',
      lead: n === 0,
      roleLabel: n === 0
        ? t('booking.guest.roleLead', { defaultValue: 'Lead guest' })
        : t('booking.guest.roleAdult', { n: n + 1, defaultValue: 'Adult {{n}}' }),
      band: ADULT_BAND,
    });
  }
  for (let n = 0; n < children && i < MAX_GUESTS; n++, i++) {
    out.push({ index: i, type: 'child', lead: false, roleLabel: t('booking.guest.roleChild', { n: n + 1, defaultValue: 'Child {{n}}' }), band: CHILD_BAND });
  }
  for (let n = 0; n < infants && i < MAX_GUESTS; n++, i++) {
    out.push({ index: i, type: 'infant', lead: false, roleLabel: t('booking.guest.roleInfant', { n: n + 1, defaultValue: 'Infant {{n}}' }), band: INFANT_BAND });
  }
  return out;
}

/** True if `iso` (YYYY-MM-DD) is a date 18+ years before today. */
function isAdult(iso: string): boolean {
  const dob = new Date(iso);
  if (Number.isNaN(dob.getTime())) return false;
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 18);
  return dob.getTime() <= cutoff.getTime();
}

/** Whole years between `iso` (YYYY-MM-DD) and today, or null if unparseable. */
function ageYears(iso: string): number | null {
  const dob = new Date(iso);
  if (Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return age;
}

// A single guest's fields. Required-ness and age bands vary by the guest's
// category and position, so the per-field rules are enforced in `superRefine`
// below rather than on the base shape — that keeps the RHF field array a stable
// length of MAX_GUESTS while only validating the visible rows.
const guestShape = z.object({
  title: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  phoneCountry: z.string().optional(),
  nationality: z.string().optional(),
  dateOfBirth: z.string().optional(),
});

function buildSchema(t: TFunction) {
  return z
    .object({
      adults: z.number().int().min(ADULTS_MIN).max(ADULTS_MAX),
      children: z.number().int().min(CHILDREN_MIN).max(CHILDREN_MAX),
      infants: z.number().int().min(INFANTS_MIN).max(INFANTS_MAX),
      guests: z.array(guestShape).length(MAX_GUESTS),
      consent: z.literal(true, {
        errorMap: () => ({ message: t('booking.guest.errorConsent', { defaultValue: 'Please confirm to continue.' }) }),
      }),
    })
    .superRefine((val, ctx) => {
      for (const d of buildDescriptors(val.adults, val.children, val.infants, t)) {
        const g = val.guests[d.index];
        const i = d.index;

        if (!g.firstName || g.firstName.trim() === '') {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['guests', i, 'firstName'], message: t('booking.guest.errorFirstName', { defaultValue: 'First name is required.' }) });
        }
        if (!g.lastName || g.lastName.trim() === '') {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['guests', i, 'lastName'], message: t('booking.guest.errorLastName', { defaultValue: 'Last name is required.' }) });
        }

        if (d.lead) {
          // Lead guest must supply a valid email and a date of birth proving 18+.
          if (!g.email || !z.string().email().safeParse(g.email).success) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['guests', i, 'email'], message: t('booking.guest.errorEmail', { defaultValue: 'A valid email is required.' }) });
          }
          if (!g.dateOfBirth) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['guests', i, 'dateOfBirth'], message: t('booking.guest.errorDobRequired', { defaultValue: 'Date of birth is required.' }) });
          } else if (!isAdult(g.dateOfBirth)) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['guests', i, 'dateOfBirth'], message: t('booking.guest.errorLeadAge', { defaultValue: 'The lead guest must be at least 18 years old.' }) });
          }
        } else if (g.dateOfBirth) {
          // Other rows: a date of birth is optional, but if given it should fall in
          // the category's band. Kept lenient — the team confirms ages at booking.
          const age = ageYears(g.dateOfBirth);
          if (age !== null) {
            if (d.type === 'adult' && age < 18) {
              ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['guests', i, 'dateOfBirth'], message: t('booking.guest.errorAdultAge', { defaultValue: 'Adults must be 18 or older.' }) });
            } else if (d.type === 'child' && (age < 2 || age > 17)) {
              ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['guests', i, 'dateOfBirth'], message: t('booking.guest.errorChildAge', { defaultValue: 'Children must be aged 2–17.' }) });
            } else if (d.type === 'infant' && age >= 2) {
              ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['guests', i, 'dateOfBirth'], message: t('booking.guest.errorInfantAge', { defaultValue: 'Infants must be under 2.' }) });
            }
          }
        }
      }
    });
}

type FormValues = z.infer<ReturnType<typeof buildSchema>>;

const inputCls =
  'w-full bg-cream border border-cream-300/70 px-3 py-2.5 text-sm text-ink focus:outline-none focus:border-ink';
const labelCls = 'block text-[0.6rem] uppercase tracking-[0.16em] text-ink-600 mb-1';
const errorCls = 'mt-1 text-[0.7rem] text-ink-600';

/** Builds the default form state, prefilling from any guests already captured. */
function buildDefaults(
  party: { adults: number; children: number; infants: number },
  existing: BookingGuest[],
): FormValues {
  const guests = Array.from({ length: MAX_GUESTS }, (_, i) => {
    const g = existing[i];
    return {
      title: g?.title ?? '',
      firstName: g?.firstName ?? '',
      lastName: g?.lastName ?? '',
      email: g?.email ?? '',
      phone: g?.phone ?? '',
      phoneCountry: g?.phoneCountry ?? '',
      nationality: g?.nationality ?? '',
      dateOfBirth: g?.dateOfBirth ?? '',
    };
  });
  return {
    adults: party.adults,
    children: party.children,
    infants: party.infants,
    guests,
    consent: false as unknown as true,
  };
}

export function GuestDetailsStep() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { journeyId, detail, selection, setGuests, setNav } = useBooking();
  const formRef = useRef<HTMLFormElement>(null);
  const schema = useMemo(() => buildSchema(t), [t]);

  // Guard: a suite must be chosen (step 2) before guests can be entered — otherwise
  // bounce back to the suite step so the occupancy cap below is well-defined.
  useEffect(() => {
    if (!selection.suiteCategory || !selection.fareCode) {
      navigate(`/journeys/${journeyId}/book/suite`, { replace: true });
    }
  }, [journeyId, selection.suiteCategory, selection.fareCode, navigate]);

  // The party (adults/children/infants) was chosen in step 1 and the suite in step 2.
  // Derive a clamped view here (capped to the chosen suite's occupancy) and mirror it
  // into the hidden form fields so the visible detail rows, `superRefine`, and
  // `isValid` all track the selection — no party steppers live on this step.
  const fare = selectedFare(detail, selection.suiteCategory, selection.fareCode);
  const maxOcc = fare ? suiteMaxOccupancy(detail, selection.suiteCategory, selection.fareCode) : MAX_GUESTS;
  const { adults, children, infants } = clampParty(selection, maxOcc);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isValid, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: buildDefaults({ adults, children, infants }, selection.guests ?? []),
  });

  const descriptors = buildDescriptors(adults, children, infants, t);

  // Keep the form's hidden party fields in lockstep with the clamped selection, so
  // the schema/superRefine validate exactly the rows that are visible.
  useEffect(() => {
    setValue('adults', adults, { shouldValidate: true });
    setValue('children', children, { shouldValidate: true });
    setValue('infants', infants, { shouldValidate: true });
  }, [adults, children, infants, setValue]);

  const onSubmit = handleSubmit((values) => {
    const visible = buildDescriptors(values.adults, values.children, values.infants, t);
    const guests: BookingGuest[] = visible.map((d) => {
      const g = values.guests[d.index];
      const guest: BookingGuest = {
        firstName: g.firstName!.trim(),
        lastName: g.lastName!.trim(),
        type: d.type,
        ...(d.lead ? { lead: true } : {}),
      };
      if (g.title) guest.title = g.title;
      if (g.email) guest.email = g.email.trim();
      if (g.phone) guest.phone = g.phone.trim();
      if (g.phoneCountry) guest.phoneCountry = g.phoneCountry.trim();
      if (g.nationality) guest.nationality = g.nationality.trim();
      if (g.dateOfBirth) guest.dateOfBirth = g.dateOfBirth;
      return guest;
    });
    setGuests(visible.length, guests);
    navigate(`/journeys/${journeyId}/book/review`);
  });

  // Register the wizard nav in the right summary box; Next submits this form.
  useEffect(() => {
    setNav({
      backTo: `/journeys/${journeyId}/book/suite`,
      backLabel: t('booking.nav.back', { defaultValue: 'Back' }),
      nextLabel: isSubmitting
        ? t('booking.guest.saving', { defaultValue: 'Saving…' })
        : t('booking.nav.next', { defaultValue: 'Next' }),
      nextDisabled: !isValid || isSubmitting,
      onNext: () => formRef.current?.requestSubmit(),
    });
  }, [journeyId, isValid, isSubmitting, setNav, t]);

  return (
    <div>
      <div className="eyebrow mb-3">{t('booking.guest.eyebrow', { defaultValue: 'Step 3' })}</div>
      <h1 className="font-serif text-display-sm text-ink">{t('booking.guest.title', { defaultValue: 'Guest details' })}</h1>
      <p className="mt-3 text-sm text-ink-600 max-w-prose">
        {t('booking.guest.intro', { defaultValue: 'Tell us who will be travelling. The lead guest receives the booking confirmation and must be 18 or older.' })}
      </p>

      <form ref={formRef} onSubmit={onSubmit} className="mt-8 space-y-8" noValidate>
        {/* One detail group per guest, ordered adults → children → infants. */}
        {descriptors.map((d) => {
          const i = d.index;
          const gErr = errors.guests?.[i];
          return (
            <fieldset key={i} className="border border-cream-300/60 bg-cream-soft p-5 md:p-6">
              <legend className="flex items-baseline gap-2 px-1">
                <span className="font-serif text-xl text-ink">{d.roleLabel}</span>
                {d.lead && <span className="text-[0.6rem] uppercase tracking-[0.16em] accent-gold">{t('booking.guest.bookingContact', { defaultValue: 'Booking contact' })}</span>}
                <span className="text-[0.6rem] uppercase tracking-[0.16em] text-ink-600">{d.band}</span>
              </legend>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {d.lead && (
                  <div className="sm:col-span-2 sm:max-w-[12rem]">
                    <label className={labelCls} htmlFor={`guests.${i}.title`}>{t('booking.guest.fieldTitle', { defaultValue: 'Title' })}</label>
                    <select id={`guests.${i}.title`} className={inputCls} {...register(`guests.${i}.title` as const)}>
                      <option value="">—</option>
                      {TITLES.map((title) => (
                        <option key={title} value={title}>{t(`booking.guest.titleOption.${title}`, { defaultValue: title })}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className={labelCls} htmlFor={`guests.${i}.firstName`}>{t('booking.guest.fieldFirstName', { defaultValue: 'First name *' })}</label>
                  <input
                    id={`guests.${i}.firstName`}
                    type="text"
                    autoComplete={d.lead ? 'given-name' : 'off'}
                    className={inputCls}
                    {...register(`guests.${i}.firstName` as const)}
                  />
                  {gErr?.firstName && <p className={errorCls}>{gErr.firstName.message}</p>}
                </div>

                <div>
                  <label className={labelCls} htmlFor={`guests.${i}.lastName`}>{t('booking.guest.fieldLastName', { defaultValue: 'Last name *' })}</label>
                  <input
                    id={`guests.${i}.lastName`}
                    type="text"
                    autoComplete={d.lead ? 'family-name' : 'off'}
                    className={inputCls}
                    {...register(`guests.${i}.lastName` as const)}
                  />
                  {gErr?.lastName && <p className={errorCls}>{gErr.lastName.message}</p>}
                </div>

                {d.lead && (
                  <>
                    <div className="sm:col-span-2">
                      <label className={labelCls} htmlFor={`guests.${i}.email`}>{t('booking.guest.fieldEmail', { defaultValue: 'Email *' })}</label>
                      <input
                        id={`guests.${i}.email`}
                        type="email"
                        autoComplete="email"
                        className={inputCls}
                        {...register(`guests.${i}.email` as const)}
                      />
                      {gErr?.email && <p className={errorCls}>{gErr.email.message}</p>}
                    </div>

                    <div className="grid grid-cols-[5rem,1fr] gap-3 sm:col-span-2">
                      <div>
                        <label className={labelCls} htmlFor={`guests.${i}.phoneCountry`}>{t('booking.guest.fieldCode', { defaultValue: 'Code' })}</label>
                        <input
                          id={`guests.${i}.phoneCountry`}
                          type="text"
                          inputMode="tel"
                          placeholder="+30"
                          autoComplete="tel-country-code"
                          className={inputCls}
                          {...register(`guests.${i}.phoneCountry` as const)}
                        />
                      </div>
                      <div>
                        <label className={labelCls} htmlFor={`guests.${i}.phone`}>{t('booking.guest.fieldPhone', { defaultValue: 'Phone' })}</label>
                        <input
                          id={`guests.${i}.phone`}
                          type="tel"
                          autoComplete="tel-national"
                          className={inputCls}
                          {...register(`guests.${i}.phone` as const)}
                        />
                      </div>
                    </div>

                    <div>
                      <label className={labelCls} htmlFor={`guests.${i}.nationality`}>{t('booking.guest.fieldNationality', { defaultValue: 'Nationality' })}</label>
                      <input
                        id={`guests.${i}.nationality`}
                        type="text"
                        autoComplete="country-name"
                        className={inputCls}
                        {...register(`guests.${i}.nationality` as const)}
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className={labelCls} htmlFor={`guests.${i}.dateOfBirth`}>
                    {t('booking.guest.fieldDateOfBirth', { defaultValue: 'Date of birth' })} {d.lead ? '*' : ''}
                  </label>
                  <input
                    id={`guests.${i}.dateOfBirth`}
                    type="date"
                    autoComplete="bday"
                    className={inputCls}
                    {...register(`guests.${i}.dateOfBirth` as const)}
                  />
                  {gErr?.dateOfBirth && <p className={errorCls}>{gErr.dateOfBirth.message}</p>}
                </div>
              </div>
            </fieldset>
          );
        })}

        {/* Consent */}
        <div>
          <label className="flex items-start gap-3 text-sm text-ink-600">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 shrink-0 border border-cream-300/70 bg-cream accent-ink"
              {...register('consent')}
            />
            <span>{t('booking.guest.consent', { defaultValue: 'I agree these details are accurate and to the booking terms.' })}</span>
          </label>
          {errors.consent && <p className={errorCls}>{errors.consent.message}</p>}
        </div>

      </form>
    </div>
  );
}
