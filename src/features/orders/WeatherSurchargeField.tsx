import { FormField } from '@/components/ui/FormField';
import { Switch } from '@/components/ui/Switch';

/** Cargo por mal clima de ESTE pedido (crear / editar): el staff puede quitarlo o cambiar el monto. */
export function WeatherSurchargeField({
  checked,
  amount,
  onCheckedChange,
  onAmountChange,
}: {
  checked: boolean;
  amount: string;
  onCheckedChange: (value: boolean) => void;
  onAmountChange: (value: string) => void;
}) {
  return (
    <>
      <Switch checked={checked} onChange={onCheckedChange} label="Cargo por mal clima" />
      {checked && (
        <FormField
          label="Cargo por mal clima (CUP)"
          type="number"
          min={0}
          step="1"
          value={amount}
          onChange={(e) => onAmountChange(e.target.value)}
        />
      )}
    </>
  );
}
