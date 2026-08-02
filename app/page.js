import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <h1 className="text-3xl md:text-4xl font-bold mb-4 max-w-2xl">
        La plateforme qui connecte influenceurs et entreprises en Guinée
      </h1>

      <p className="text-gray-600 max-w-xl mb-10">
        Trouvez le bon influenceur pour votre marque, ou proposez vos services de promotion
        en toute confiance. Comptes vérifiés, contact direct, sans intermédiaire.
      </p>

      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
        <Link
          href="/annuaire"
          className="flex-1 py-3 rounded-lg bg-blue-600 text-white font-semibold text-center hover:bg-blue-700"
        >
          Voir les influenceurs
        </Link>
        <Link
          href="/inscription"
          className="flex-1 py-3 rounded-lg border-2 border-blue-600 text-blue-600 font-semibold text-center hover:bg-blue-50"
        >
          Créer un compte
        </Link>
      </div>

      <p className="mt-8 text-sm text-gray-500">
        Déjà inscrit ?{' '}
        <Link href="/connexion" className="text-blue-600 underline">
          Se connecter
        </Link>
      </p>
    </div>
  )
}