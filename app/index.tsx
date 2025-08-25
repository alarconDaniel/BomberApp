// app/index.tsx
import { Redirect } from 'expo-router';

export default function Index() {
  // Arranca siempre en el Home del grupo (operario)
  return <Redirect href='/(admin)/OperariosScreen' />;
}
