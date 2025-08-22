import {StyleSheet} from "react-native";

export const styles = StyleSheet.create({
    container: {
        width: '100%',
        paddingBottom: 40,
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingTop: 12,
        backgroundColor: '#fefefe',
        borderTopWidth: 1,
        borderColor: '#ddd'
    },
    containerHeader: {
        width: '100%',
        paddingBottom: 12,
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingTop: 50,
        borderColor: '#ddd'
    },
    button: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center'
    },
    active: {
        backgroundColor: '#c5e1f5'
    },
    icon: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#444'
    },
    iconActive: {
        color: '#007bff'
    }
});