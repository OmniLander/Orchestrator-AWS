from source.app import create_app # Assuming your factory is in the 'src' package

app = create_app()

if __name__ == '__main__':
    app.run(debug=True)