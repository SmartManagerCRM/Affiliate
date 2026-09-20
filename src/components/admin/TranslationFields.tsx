import { Field, TextInput, TextArea } from "@/components/admin/FormField";
import { localeNames, type Locale } from "@/i18n/routing";
import { translatableLocales } from "@/lib/adminTranslations";

type FieldSpec = { name: string; label: string; multiline?: boolean };

export function TranslationFields({
  fields,
  translations,
}: {
  fields: FieldSpec[];
  translations?: unknown;
}) {
  const values = (translations ?? {}) as Partial<Record<Locale, Record<string, string>>>;

  return (
    <div className="rounded-2xl border border-espresso/10 bg-beige/40 p-4">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-espresso/45">
        Translations
      </h3>
      <p className="mt-1 mb-4 text-xs text-espresso/50">
        Optional. Leave a field blank to fall back to the English text above when this page is
        viewed in that language.
      </p>
      <div className="flex flex-col gap-5">
        {translatableLocales.map((locale) => (
          <div key={locale}>
            <h4 className="mb-2 text-sm font-semibold text-espresso/70">{localeNames[locale]}</h4>
            <div className="flex flex-col gap-3">
              {fields.map((field) => (
                <Field key={field.name} label={field.label}>
                  {field.multiline ? (
                    <TextArea
                      name={`translations.${locale}.${field.name}`}
                      defaultValue={values[locale]?.[field.name] ?? ""}
                      dir={locale === "ar" ? "rtl" : "ltr"}
                    />
                  ) : (
                    <TextInput
                      name={`translations.${locale}.${field.name}`}
                      defaultValue={values[locale]?.[field.name] ?? ""}
                      dir={locale === "ar" ? "rtl" : "ltr"}
                    />
                  )}
                </Field>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
