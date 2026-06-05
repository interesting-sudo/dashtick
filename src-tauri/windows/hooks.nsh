!macro NSIS_HOOK_POSTINSTALL
  ; 将 WebView2Loader.dll 从 resources 复制到安装目录（exe 同级）
  ${If} ${FileExists} "$INSTDIR\resources\WebView2Loader.dll"
    CopyFiles "$INSTDIR\resources\WebView2Loader.dll" "$INSTDIR\WebView2Loader.dll"
    Delete "$INSTDIR\resources\WebView2Loader.dll"
  ${EndIf}
!macroend
