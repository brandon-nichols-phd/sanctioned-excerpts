import React, { useRef, useState } from 'react'
import { View, Pressable, StyleSheet, ActivityIndicator } from 'react-native'
import { WebView } from 'react-native-webview'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'

export default function Home() {
  const webRef = useRef<WebView>(null)
  const [loading, setLoading] = useState(true)

  const apply65 = `
    (function () {
      var m = document.querySelector('meta[name=viewport]');
      if (!m) { m = document.createElement('meta'); m.name='viewport'; document.head.appendChild(m); }
      m.setAttribute('content','width=device-width, initial-scale=0.65, maximum-scale=5.0, user-scalable=yes');
    })();
    true;
  `

  const refresh = () => {
    webRef.current?.reload()
  }

  return (
    <View style={{ flex: 1 }}>
      <WebView
        ref={webRef}
        source={{ uri: 'https://pathspot.app/#/sensors-overview' }}
        startInLoadingState
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => {
          setLoading(false)
          webRef.current?.injectJavaScript(apply65)
        }}
        // iOS niceties:
        allowsBackForwardNavigationGestures
        onContentProcessDidTerminate={refresh}  // auto-reload if the process dies
      />

      {/* Floating refresh button (iOS) */}
      <Pressable
        style={styles.fab}
        onPress={refresh}
        accessibilityRole="button"
        accessibilityLabel="Actualizar"
      >
        {loading
          ? <ActivityIndicator color="#fff" />
          : <MaterialCommunityIcons name="refresh" size={22} color="#fff" />
        }
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 24,                 // sits above the Home indicator
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0E5667',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
})