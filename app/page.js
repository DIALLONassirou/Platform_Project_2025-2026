import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 flex flex-col items-center justify-center px-6 text-center">
      <h1 className="text-3xl md:text-4xl font-bold mb-4 max-w-2xl text-gray-900">
        La plateforme qui connecte{' '}
        <span className="bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
          influenceurs et entreprises
        </span>{' '}
        en Guinée
      </h1>

      <p className="text-gray-600 max-w-xl mb-10">
        Trouvez le bon influenceur pour votre marque, ou proposez vos services de promotion
        en toute confiance. Comptes vérifiés, contact direct, sans intermédiaire.
      </p>

      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-lg mb-4">
        <Link
          href="/campagnes"
          className="flex-1 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold text-center shadow-lg shadow-blue-200 hover:from-blue-700 hover:to-blue-600 transition"
        >
          Voir les campagnes
        </Link>
        <Link
          href="/annuaire?type=influencer"
          className="flex-1 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold text-center shadow-lg shadow-blue-200 hover:from-blue-700 hover:to-blue-600 transition"
        >
          Voir les influenceurs
        </Link>
        <Link
          href="/annuaire?type=business"
          className="flex-1 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold text-center shadow-lg shadow-blue-200 hover:from-blue-700 hover:to-blue-600 transition"
        >
          Voir les entreprises
        </Link>
      </div>

      <Link
        href="/inscription"
        className="w-full max-w-lg py-3 rounded-lg border-2 border-blue-600 text-blue-600 font-semibold text-center bg-white/70 hover:bg-blue-50 transition"
      >
        Créer un compte
      </Link>

      <p className="mt-8 text-sm text-gray-500">
        Déjà inscrit ?{' '}
        <Link href="/connexion" className="text-blue-600 underline">
          Se connecter
        </Link>
      </p>
    </div>
  )
}