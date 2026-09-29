;; Development environment: guix shell -m manifest.scm
(use-modules (gnu packages))

(specifications->manifest
 '("node@24.18.0"                 ; Includes npm; matches .nvmrc.
   "bash"                         ; Project launcher and npm scripts.
   "coreutils"                    ; Launcher hashing and file utilities.
   "nss-certs"))                  ; HTTPS package downloads and news feeds.
