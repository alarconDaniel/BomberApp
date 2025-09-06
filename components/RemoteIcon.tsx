// components/RemoteIcon.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Image, ActivityIndicator, Text, ViewStyle, StyleProp, Platform } from 'react-native';
import { SvgXml } from 'react-native-svg';

type Props = {
    pathOrUrl: string;          // ej: "/static/icons/items/x2.svg" o "https://..."
    baseUrl?: string;           // ej: desde AuthContext
    size?: number;              // px
    style?: StyleProp<ViewStyle>;
    borderRadius?: number;
    bgColor?: string;
    /** Tamaño máximo de SVG a aceptar (bytes). Evita OOM/locuras. */
    maxBytes?: number;          // default 250 KB
    /** Timeout del fetch */
    timeoutMs?: number;         // default 6000
};

const isHttp = (s: string) => /^https?:\/\//i.test(s);
const isSvgPath = (s: string) => /\.svg(\?.*)?$/i.test(s);
const joinUrl = (base: string | undefined, path: string) => {
    if (!path) return '';
    if (isHttp(path)) return encodeURI(path);
    if (!base) return encodeURI(path);
    const b = base.replace(/\/+$/, '');
    const p = path.startsWith('/') ? path : `/${path}`;
    return encodeURI(`${b}${p}`);
};

export default function RemoteIcon({
                                       pathOrUrl,
                                       baseUrl = process.env.EXPO_PUBLIC_API_URL || '',
                                       size = 60,
                                       style,
                                       borderRadius = 10,
                                       bgColor = '#E5E7EB',
                                       maxBytes = 250 * 1024,
                                       timeoutMs = 6000,
                                   }: Props) {
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [svgXml, setSvgXml] = useState<string | null>(null);
    const mounted = useRef(true);

    const uri = useMemo(() => joinUrl(baseUrl, pathOrUrl), [baseUrl, pathOrUrl]);
    const isSvg = useMemo(() => isSvgPath(uri), [uri]);

    useEffect(() => {
        mounted.current = true;
        setError(null);
        setLoading(true);
        setSvgXml(null);

        if (!uri) {
            setError('empty');
            setLoading(false);
            return;
        }

        // Si no es .svg => dejamos que lo renderice <Image>
        if (!isSvg) {
            setLoading(false);
            return;
        }

        // Fetch con timeout + validación
        const ctl = new AbortController();
        const t = setTimeout(() => ctl.abort(), timeoutMs);

        (async () => {
            try {
                const resp = await fetch(uri, { signal: ctl.signal });
                if (!resp.ok) {
                    throw new Error(`HTTP ${resp.status}`);
                }

                // Opcional: valida Content-Type si viene
                const ctype = resp.headers.get('Content-Type') || '';
                // Si no trae image/svg+xml… igual puede ser válido, seguimos leyendo texto.

                // Lee como text y corta si excede maxBytes
                const reader = resp.body?.getReader?.();
                let text = '';
                if (reader) {
                    let total = 0;
                    const dec = new TextDecoder('utf-8');
                    while (true) {
                        const { value, done } = await reader.read();
                        if (done) break;
                        total += value?.length || 0;
                        if (total > maxBytes) throw new Error('SVG too large');
                        text += dec.decode(value, { stream: true });
                    }
                    text += dec.decode(); // flush
                } else {
                    // fallback para RN que no expone body streams
                    const buf = await resp.text();
                    if (buf.length > maxBytes) throw new Error('SVG too large');
                    text = buf;
                }

                // Validación mínima: debe empezar con <svg
                const trimmed = text.trim().slice(0, 200).toLowerCase();
                if (!trimmed.startsWith('<svg')) {
                    throw new Error('Not SVG');
                }

                // Algunos SVGs traen DOCTYPE o entidades que rompen en Android antiguos; limpieza suavecita:
                let safe = text
                    .replace(/<!DOCTYPE[^>]*>/gi, '')
                    .replace(/<!--[\s\S]*?-->/g, '');

                if (mounted.current) {
                    setSvgXml(safe);
                    setLoading(false);
                }
            } catch (e: any) {
                if (mounted.current) {
                    setError(e?.message || 'fetch-fail');
                    setLoading(false);
                }
            } finally {
                clearTimeout(t);
            }
        })();

        return () => {
            mounted.current = false;
            clearTimeout(t);
            ctl.abort();
        };
    }, [uri, isSvg, maxBytes, timeoutMs]);

    const box: ViewStyle = {
        width: size,
        height: size,
        borderRadius,
        overflow: 'hidden',
        backgroundColor: bgColor,
        alignItems: 'center',
        justifyContent: 'center',
    };

    // Fallback final (error)
    if (!uri || error) {
        return (
            <View style={[box, style]}>
                <Text style={{ fontSize: Math.max(18, size * 0.4) }}>🏆</Text>
            </View>
        );
    }

    // PNG/JPG/etc: renderiza <Image>
    if (!isSvg) {
        return (
            <View style={[box, style]}>
                {loading && <ActivityIndicator size="small" style={{ position: 'absolute' }} />}
                <Image
                    source={{ uri }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                    onError={() => setError('img-fail')}
                    onLoadEnd={() => setLoading(false)}
                />
            </View>
        );
    }

    // SVG por XML validado
    return (
        <View style={[box, style]}>
            {loading && <ActivityIndicator size="small" style={{ position: 'absolute' }} />}
            {svgXml ? (
                <SvgXml xml={svgXml} width={size} height={size} />
            ) : (
                // Mientras baja/valida
                <ActivityIndicator size="small" />
            )}
        </View>
    );
}
