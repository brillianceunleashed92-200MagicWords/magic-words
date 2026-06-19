const BASE =
  "font-body font-bold px-6 py-3 sm:px-8 sm:py-4 rounded-2xl transition-all inline-flex items-center justify-center";

const VARIANTS = {
  primary: "bg-sunrise-coral text-dawn-indigo hover:brightness-105",
  secondary: "bg-comet-teal text-dawn-indigo hover:brightness-105",
  outline: "border border-cloud/30 text-cloud hover:bg-cloud/10",
  "outline-dark": "border border-dawn-indigo/30 text-dawn-indigo hover:bg-dawn-indigo/10",
};

// `as` lets this render as <Link>, <a>, or <button> — e.g. <Button as={Link} to="/app">.
export default function Button({ as: Component = "button", variant = "primary", className = "", children, ...props }) {
  return (
    <Component className={`${BASE} ${VARIANTS[variant]} ${className}`} {...props}>
      {children}
    </Component>
  );
}
