Red='\033[0;31m'          # Red
Green='\033[0;32m'        # Green
Color_Off='\033[0m'       # Text Reset

if [ $# -eq 0 ]
  then
    echo -e "\n${Red}Please supply the app version and build number as argument with no spaces. Example: v0.1.0-build0001\n"
    exit
  else
    echo -e "\n${Green}Running Quasar Capacitor build...\n"
    quasar build -m capacitor -T android
    echo -e "\n${Green}Running jarsigner...\n"
    cd src-capacitor/android/app/build/outputs/apk/release
    jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore paytaca.keystore app-release-unsigned.apk paytacakey
    echo -e "\n${Green}Running zipalign...\n"
    ~/Library/Android/sdk/build-tools/30.0.2/zipalign -v 4 app-release-unsigned.apk paytaca-$1.apk
    open .
    exit
fi
