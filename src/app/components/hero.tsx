export default function Hero() {
  return (
    <>
      <section className="relative flex min-h-[60vh] w-full max-w-5xl items-center justify-center md:max-w-7xl">
        <div className="mx-auto flex max-w-4xl flex-col items-center justify-center px-4 py-40 text-center sm:py-40 md:py-60">
          <p className="text-accent mb-2">Velkommen til TIHLDE!</p>
          <h1 className="mb-4 text-4xl font-extrabold text-foreground sm:text-5xl md:text-7xl">
            Fadderuken
          </h1>

          <p className="mb-8 text-base text-muted-foreground sm:text-lg">
            Her finner du alt av informasjon knyttet til fadderuken.
          </p>
        </div>
      </section>
    </>
  );
}
