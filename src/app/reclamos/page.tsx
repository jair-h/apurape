import { redirect } from "next/navigation";

/* La ruta vieja. El Libro vive ahora en /libro-de-reclamaciones, que es como
 * lo busca la gente y como lo nombra la norma.
 *
 * Se mantiene como redirect permanente en vez de borrarse: estaba enlazada
 * desde el footer y el sitemap, y puede estar en correos ya enviados o
 * indexada. Un 404 en la página del Libro de Reclamaciones es justo lo que
 * no debe pasar. */

export default function ReclamosRedirect() {
  redirect("/libro-de-reclamaciones");
}
