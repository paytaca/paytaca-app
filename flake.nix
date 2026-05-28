{
  description = "Paytaca App Development Environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs {
          inherit system;
          config.allowUnfree = true;
        };

        # Cypress and Electron dependencies for Linux
        linuxDeps = with pkgs; [
          at-spi2-atk
          atk
          cairo
          cups
          dbus
          expat
          fontconfig
          freetype
          gdk-pixbuf
          glib
          gtk3
          libX11
          libXcomposite
          libXcursor
          libXdamage
          libXext
          libXfixes
          libXi
          libXrandr
          libXrender
          libXtst
          libdrm
          libgbm
          libnotify
          libxcb
          libxshmfence
          mesa
          nspr
          nss
          pango
          systemd
        ];
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            nodejs_latest
            python315
            git
            gnumake
            gcc
            pkg-config
          ] ++ (if system == "x86_64-linux" || system == "aarch64-linux" then linuxDeps else []);

          shellHook = ''
            export PATH="$PWD/node_modules/.bin:$PATH"
            
            # Ensure Cypress and Electron can find their libraries on NixOS
            if [ -f /etc/os-release ] && grep -q NixOS /etc/os-release; then
              export LD_LIBRARY_PATH="${pkgs.lib.makeLibraryPath linuxDeps}:$LD_LIBRARY_PATH"
            fi

            echo "Welcome to the Paytaca development environment!"
            echo "Node.js: $(node --version)"
            echo "Python: $(python --version)"
            echo "Git: $(git --version)"
            echo ""
            echo "Commands:"
            echo "  npm install      - Install dependencies"
            echo "  npm run dev      - Start development server (SPA)"
            echo "  npx quasar dev   - Run quasar development server"
            echo ""
          '';
        };
      });
}
