import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from '@earn/components/ui/form';
import { Switch } from '@earn/components/ui/switch';

import { useListingForm } from '../../../hooks';

export function Foundation() {
  const form = useListingForm();
  if (!form) return null;
  return (
    <FormField
      name="isFndnPaying"
      control={form.control}
      render={({ field }) => {
        return (
          <FormItem className="flex flex-row items-center justify-between">
            <div className="">
              <FormLabel className="">Payment via TSION?</FormLabel>
              <FormDescription>
                Will TSION pay for this Listing?
              </FormDescription>
            </div>
            <FormControl className="flex items-center">
              <Switch
                checked={field.value}
                onCheckedChange={(e) => {
                  field.onChange(e);
                  form.saveDraft();
                }}
              />
            </FormControl>
          </FormItem>
        );
      }}
    />
  );
}
