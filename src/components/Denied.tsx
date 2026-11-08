import { signOut } from '../lib/useAuth';
import Button from './Button';
import Gate from './Gate';

export default function Denied({ email }: { email?: string }) {
  return (
    <Gate>
      <p className="m-0 text-[13px] leading-normal text-muted">
        Пошта <b className="text-ink">{email}</b> не має доступу до цієї мапи. Попросіть власника додати її до списку дозволених і зайдіть знову.
      </p>
      <Button onClick={() => void signOut()}>Вийти</Button>
    </Gate>
  );
}
