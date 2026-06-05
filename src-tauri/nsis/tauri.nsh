!macro customInstall
  ; 将 WebView2Loader.dll 复制到安装目录
  SetOutPath $INSTDIR
  File /oname=WebView2Loader.dll "${__THISDIR}\..\WebView2Loader.dll"
!macroend
